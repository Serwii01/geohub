import { useMemo, useState } from 'react'
import { CountryInput } from '../components/CountryInput'
import { GameLayout, Loading, Stat } from '../components/GameLayout'
import { DailyResult, ModeSwitch, useDailyPuzzle } from '../components/RoundGame'
import { WorldMap } from '../components/WorldMap'
import { BY_CODE, COUNTRIES, flagUrl, type Country } from '../data/countries'
import { mainShape, useGeo } from '../data/geo'
import { distanceKm, getBest, pick, saveBest } from '../lib/utils'

const MAX_MISSES = 3

export default function NeighborsGame() {
  const geo = useGeo()
  const pool = useMemo(
    () => (geo ? COUNTRIES.filter((c) => geo.byCode.has(c.code) && c.borders.length >= 2) : []),
    [geo],
  )
  const mode = useDailyPuzzle<{ found: string[]; misses: string[]; gaveUp: boolean }>('vecinos')
  const dailyTarget = useMemo(
    () => (pool.length ? pick(pool.filter((c) => c.borders.length >= 3), mode.rng()) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pool, mode.date],
  )
  const [freeTarget, setFreeTarget] = useState<Country | null>(null)
  const [free, setFree] = useState({ found: [] as string[], misses: [] as string[], gaveUp: false })
  const [streak, setStreak] = useState(0)

  if (pool.length && !freeTarget) setFreeTarget(pick(pool))
  const target = mode.daily ? dailyTarget : freeTarget
  if (!geo || !target) return <GameLayout title="Vecinos"><Loading /></GameLayout>

  const state = mode.daily ? (mode.record?.progress ?? { found: [], misses: [], gaveUp: false }) : free
  const { found, misses, gaveUp } = state

  const neighbors = target.borders.filter((b) => BY_CODE.has(b))
  const won = found.length === neighbors.length
  const lost = !won && (misses.length >= MAX_MISSES || gaveUp)
  const over = won || lost

  function update(next: typeof state) {
    const done = next.found.length === neighbors.length || next.misses.length >= MAX_MISSES || next.gaveUp
    if (mode.daily) {
      mode.save({
        done,
        score: next.found.length,
        max: neighbors.length,
        squares: '🟩'.repeat(next.found.length) + '🟥'.repeat(next.misses.length),
        progress: next,
      })
    } else {
      setFree(next)
    }
  }

  function guess(c: Country) {
    if (over || !target) return
    if (neighbors.includes(c.code)) {
      const next = [...found, c.code]
      update({ ...state, found: next })
      if (!mode.daily && next.length === neighbors.length) {
        setStreak(streak + 1)
        saveBest('vecinos', streak + 1)
      }
    } else {
      const next = [...misses, c.code]
      update({ ...state, misses: next })
      if (!mode.daily && next.length >= MAX_MISSES) setStreak(0)
    }
  }

  function newGame() {
    setFreeTarget(pick(pool.filter((c) => c.code !== target?.code)))
    setFree({ found: [], misses: [], gaveUp: false })
  }

  // Encuadre: el país y sus vecinos cercanos (Francia linda con Brasil, pero no queremos ver medio mundo)
  const fit = [target.code, ...neighbors]
    .map((code) => BY_CODE.get(code)!)
    .filter((c) => distanceKm(c.latlng, target.latlng) < 3000)
    .map((c) => geo.byCode.get(c.code))
    .filter((f) => !!f)
    .map((f) => mainShape(f!))

  const fill = (code: string) => {
    if (code === target.code) return 'var(--primary)'
    if (found.includes(code)) return 'var(--good)'
    if (misses.includes(code)) return 'var(--bad)'
    if (lost && neighbors.includes(code)) return 'var(--warn)'
    return undefined
  }

  return (
    <GameLayout
      title="Vecinos"
      subtitle="Nombra todos los países con los que hace frontera terrestre. Tres fallos y se acaba."
      stats={
        <>
          <Stat label="Vecinos" value={`${found.length}/${neighbors.length}`} />
          <Stat label="Fallos" value={`${misses.length}/${MAX_MISSES}`} />
          {!mode.daily && <Stat label="Racha" value={streak} />}
          {!mode.daily && <Stat label="Récord" value={getBest('vecinos')} />}
        </>
      }
    >
      <div className="toolbar">
        <span className="muted">{mode.daily ? 'El mismo país para todos hoy.' : 'Países al azar, sin límite.'}</span>
        <ModeSwitch value={mode.playMode} onChange={mode.setPlayMode} />
      </div>
      <div className="split wide-map">
        <div className="card map-card">
          <WorldMap features={geo.all} fit={fit} fill={fill} height={540} padding={50} zoomable />
        </div>
        <div className="card">
          <div className="target-title">
            <img className="flag-small" src={flagUrl(target, 160)} alt="" />
            <h2>{target.name}</h2>
          </div>
          {over ? (
            <div className="reveal">
              <strong>{won ? 'Todos los vecinos' : 'Se acabó'}</strong>
              {lost && (
                <span>
                  Faltaban:{' '}
                  {neighbors
                    .filter((n) => !found.includes(n))
                    .map((n) => BY_CODE.get(n)!.name)
                    .join(', ')}
                </span>
              )}
              {mode.daily ? (
                <DailyResult
                  title="Vecinos"
                  date={mode.date}
                  squares={mode.record?.squares ?? ''}
                  score={`${found.length}/${neighbors.length}`}
                  onFree={() => mode.setPlayMode('libre')}
                />
              ) : (
                <button className="btn primary" onClick={newGame}>
                  Otro país
                </button>
              )}
            </div>
          ) : (
            <>
              <CountryInput onSubmit={guess} exclude={new Set([target.code, ...found, ...misses])} />
              <button className="btn" onClick={() => update({ ...state, gaveUp: true })}>
                Me rindo
              </button>
            </>
          )}
          <ul className="chip-list">
            {found.map((c) => (
              <li key={c} className="found">
                {BY_CODE.get(c)!.name}
              </li>
            ))}
            {misses.map((c) => (
              <li key={c} className="missed">
                {BY_CODE.get(c)!.name}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </GameLayout>
  )
}

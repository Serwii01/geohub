import { useMemo, useState } from 'react'
import { CountryInput } from '../components/CountryInput'
import { Icon } from '../components/Icons'
import { GameLayout, Loading, Stat } from '../components/GameLayout'
import { DailyResult, ModeSwitch, useDailyPuzzle } from '../components/RoundGame'
import { Silhouette } from '../components/Silhouette'
import { WorldMap } from '../components/WorldMap'
import { BY_CODE, COUNTRIES, flagUrl, type Country } from '../data/countries'
import { useGeo } from '../data/geo'
import { useGameKeys } from '../lib/keys'
import { bearing, distanceKm, formatNumber, getBest, pick, saveBest } from '../lib/utils'

const MAX_TRIES = 6
const MAX_DIST = 20000

interface Guess {
  country: Country
  km: number
  dir: number
  pct: number
}

function makeGuess(c: Country, target: Country): Guess {
  const km = c.code === target.code ? 0 : distanceKm(c.latlng, target.latlng)
  return {
    country: c,
    km,
    dir: bearing(c.latlng, target.latlng),
    pct: km === 0 ? 100 : Math.max(0, Math.round((1 - km / MAX_DIST) * 100)),
  }
}

export default function SilhouetteGame() {
  const geo = useGeo()
  const mode = useDailyPuzzle<string[]>('siluetas')
  const pool = useMemo(
    () => (geo ? COUNTRIES.filter((c) => geo.byCode.has(c.code) && c.area >= 500) : []),
    [geo],
  )
  const dailyTarget = useMemo(
    () => (pool.length ? pick(pool.filter((c) => c.area >= 20000), mode.rng()) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pool, mode.date],
  )
  const [freeTarget, setFreeTarget] = useState<Country | null>(null)
  const [freeGuesses, setFreeGuesses] = useState<string[]>([])
  const [streak, setStreak] = useState(0)

  if (pool.length && !freeTarget) setFreeTarget(pick(pool))
  const target = mode.daily ? dailyTarget : freeTarget
  const codes = mode.daily ? (mode.record?.progress ?? []) : freeGuesses
  const over = !!target && (codes.includes(target.code) || codes.length >= MAX_TRIES)
  useGameKeys({ onNext: over && !mode.daily ? () => newGame() : undefined })
  if (!geo || !target) return <GameLayout title="Siluetas"><Loading /></GameLayout>

  const guesses = codes.map((code) => makeGuess(BY_CODE.get(code)!, target))
  const won = codes.includes(target.code)

  function guess(c: Country) {
    if (over || !target) return
    const next = [...codes, c.code]
    const hit = c.code === target.code
    const end = hit || next.length >= MAX_TRIES
    if (mode.daily) {
      mode.save({
        done: end,
        score: hit ? MAX_TRIES - next.length + 1 : 0,
        max: MAX_TRIES,
        squares: next.map((code) => (code === target.code ? '🟩' : makeGuess(BY_CODE.get(code)!, target).pct >= 75 ? '🟨' : '⬜')).join(''),
        progress: next,
      })
      return
    }
    setFreeGuesses(next)
    if (hit) {
      const s = streak + 1
      setStreak(s)
      saveBest('siluetas', s)
    } else if (end) {
      setStreak(0)
    }
  }

  function newGame() {
    setFreeTarget(pick(pool.filter((c) => c.code !== target?.code)))
    setFreeGuesses([])
  }

  return (
    <GameLayout
      title="Siluetas"
      subtitle="Adivina el país por su forma. Te damos distancia y dirección."
      stats={
        <>
          <Stat label="Intento" value={`${Math.min(codes.length + (over ? 0 : 1), MAX_TRIES)}/${MAX_TRIES}`} />
          {!mode.daily && <Stat label="Racha" value={streak} />}
          {!mode.daily && <Stat label="Récord" value={getBest('siluetas')} />}
        </>
      }
    >
      <div className="toolbar">
        <span className="muted">{mode.daily ? 'La misma silueta para todos hoy.' : 'Países al azar, sin límite.'}</span>
        <ModeSwitch value={mode.playMode} onChange={mode.setPlayMode} />
      </div>
      <div className="split">
        <div className="card center">
          <Silhouette feature={geo.byCode.get(target.code)!} />
          {over && (
            <div className="reveal">
              <img className="flag-small" src={flagUrl(target, 160)} alt="" />
              <strong>{target.name}</strong>
              <span>{won ? `¡Acertaste en ${codes.length}!` : 'Se acabaron los intentos'}</span>
            </div>
          )}
        </div>
        <div className="card">
          {!over && <CountryInput onSubmit={guess} exclude={new Set(codes)} autoFocus />}
          <ul className="guess-list">
            {guesses.map((g) => (
              <li key={g.country.code} className={g.km === 0 ? 'correct' : ''}>
                <span className="g-name">{g.country.name}</span>
                <span className="g-km">{formatNumber(g.km)} km</span>
                <span className="g-dir">
                  {g.km === 0 ? '✓' : <Icon name="arrow" size={18} className="arrow" style={{ transform: `rotate(${g.dir}deg)` }} />}
                </span>
                <span className="g-pct">
                  <span className="bar" style={{ width: `${g.pct}%` }} />
                  <span>{g.pct}%</span>
                </span>
              </li>
            ))}
            {Array.from({ length: MAX_TRIES - guesses.length }).map((_, i) => (
              <li key={`e${i}`} className="empty" />
            ))}
          </ul>
          {over && (
            <>
              <WorldMap
                features={geo.all}
                fill={(code) => (code === target.code ? 'var(--good)' : codes.includes(code) ? 'var(--warn)' : undefined)}
              />
              {mode.daily ? (
                <DailyResult
                  title="Siluetas"
                  date={mode.date}
                  squares={mode.record?.squares ?? ''}
                  score={won ? `${codes.length}/${MAX_TRIES}` : `X/${MAX_TRIES}`}
                  onFree={() => mode.setPlayMode('libre')}
                />
              ) : (
                <button className="btn primary" onClick={newGame}>
                  Nuevo país → <kbd>Intro</kbd>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </GameLayout>
  )
}

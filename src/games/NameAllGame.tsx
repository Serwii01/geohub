import { useEffect, useMemo, useState } from 'react'
import { GameLayout, Loading, RegionPicker, Stat, type RegionOption } from '../components/GameLayout'
import { WorldMap } from '../components/WorldMap'
import { findCountry, inRegion } from '../data/countries'
import { regionFit, useGeo } from '../data/geo'
import { getBest, saveBest } from '../lib/utils'

const TIME: Record<RegionOption, number> = {
  Mundo: 15 * 60,
  Europa: 6 * 60,
  Asia: 6 * 60,
  África: 7 * 60,
  América: 5 * 60,
  Oceanía: 3 * 60,
}

function clock(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function NameAllGame() {
  const geo = useGeo()
  const [region, setRegion] = useState<RegionOption>('Europa')
  const pool = useMemo(() => inRegion(region), [region])
  const [found, setFound] = useState<string[]>([])
  const [text, setText] = useState('')
  const [left, setLeft] = useState(TIME[region])
  const [status, setStatus] = useState<'idle' | 'playing' | 'over'>('idle')
  const bestKey = `nombra:${region}`

  useEffect(() => {
    setFound([])
    setText('')
    setLeft(TIME[region])
    setStatus('idle')
  }, [region])

  useEffect(() => {
    if (status !== 'playing') return
    const id = setInterval(() => setLeft((l) => l - 1), 1000)
    return () => clearInterval(id)
  }, [status])

  useEffect(() => {
    if (status === 'playing' && (left <= 0 || found.length === pool.length)) finish()
  }) // eslint-disable-line react-hooks/exhaustive-deps

  const fit = useMemo(() => (geo ? regionFit(geo, region) : undefined), [geo, region])

  function finish() {
    setStatus('over')
    saveBest(bestKey, found.length)
  }

  function onType(value: string) {
    if (status === 'idle') setStatus('playing')
    const c = findCountry(value, pool)
    if (c && !found.includes(c.code)) {
      setFound([c.code, ...found])
      setText('')
    } else {
      setText(value)
    }
  }

  if (!geo) return <GameLayout title="Contrarreloj"><Loading /></GameLayout>

  const foundSet = new Set(found)
  const fill = (code: string) => {
    if (foundSet.has(code)) return 'var(--good)'
    if (status === 'over' && pool.some((c) => c.code === code)) return 'var(--bad)'
    return undefined
  }

  return (
    <GameLayout
      title="Contrarreloj"
      subtitle="Nombra todos los países del continente antes de que acabe el tiempo."
      stats={
        <>
          <Stat label="Tiempo" value={clock(Math.max(0, left))} />
          <Stat label="Países" value={`${found.length}/${pool.length}`} />
          <Stat label="Récord" value={getBest(bestKey)} />
        </>
      }
    >
      <div className="toolbar">
        <RegionPicker value={region} onChange={setRegion} />
      </div>
      <div className="split wide-map">
        <div className="card map-card">
          <WorldMap features={geo.all} fit={fit} fill={fill} height={520} />
        </div>
        <div className="card">
          {status !== 'over' ? (
            <>
              <div className="country-input">
                <input
                  value={text}
                  placeholder={status === 'idle' ? 'Empieza a escribir para arrancar el reloj…' : 'Escribe un país…'}
                  onChange={(e) => onType(e.target.value)}
                  autoFocus
                />
              </div>
              <button className="btn ghost" onClick={finish} disabled={status !== 'playing'}>
                Me rindo
              </button>
            </>
          ) : (
            <div className="reveal">
              <strong>
                {found.length === pool.length ? 'Todos. Impecable.' : `Has nombrado ${found.length} de ${pool.length}`}
              </strong>
              <button
                className="btn primary"
                onClick={() => {
                  setFound([])
                  setLeft(TIME[region])
                  setStatus('idle')
                }}
              >
                Jugar otra vez
              </button>
            </div>
          )}
          <div className="progress">
            <div style={{ width: `${(found.length / pool.length) * 100}%` }} />
          </div>
          <ul className="chip-list">
            {(status === 'over' ? pool : pool.filter((c) => foundSet.has(c.code))).map((c) => (
              <li key={c.code} className={foundSet.has(c.code) ? 'found' : 'missed'}>
                {c.name}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </GameLayout>
  )
}

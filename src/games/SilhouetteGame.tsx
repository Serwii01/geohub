import { useMemo, useState } from 'react'
import { geoAzimuthalEqualArea, geoCentroid, geoPath } from 'd3-geo'
import { CountryInput } from '../components/CountryInput'
import { Icon } from '../components/Icons'
import { GameLayout, Loading, Stat } from '../components/GameLayout'
import { WorldMap } from '../components/WorldMap'
import { COUNTRIES, flagUrl, type Country } from '../data/countries'
import { mainShape, useGeo, type CountryFeature } from '../data/geo'
import { bearing, distanceKm, formatNumber, getBest, pick, saveBest } from '../lib/utils'

const MAX_TRIES = 6
const MAX_DIST = 20000

function Silhouette({ feature }: { feature: CountryFeature }) {
  const d = useMemo(() => {
    const shape = mainShape(feature)
    const [lon, lat] = geoCentroid(shape)
    const projection = geoAzimuthalEqualArea()
      .rotate([-lon, -lat])
      .fitExtent(
        [
          [20, 20],
          [380, 380],
        ],
        shape,
      )
    return geoPath(projection)(shape) ?? ''
  }, [feature])
  return (
    <svg className="silhouette" viewBox="0 0 400 400">
      <path d={d} />
    </svg>
  )
}

interface Guess {
  country: Country
  km: number
  dir: number
  pct: number
}

export default function SilhouetteGame() {
  const geo = useGeo()
  const pool = useMemo(
    () => (geo ? COUNTRIES.filter((c) => geo.byCode.has(c.code) && c.area >= 500) : []),
    [geo],
  )
  const [target, setTarget] = useState<Country | null>(null)
  const [guesses, setGuesses] = useState<Guess[]>([])
  const [streak, setStreak] = useState(0)

  if (geo && !target && pool.length) setTarget(pick(pool))
  if (!geo || !target) return <GameLayout title="Siluetas" icon="shape"><Loading /></GameLayout>

  const won = guesses.some((g) => g.country.code === target.code)
  const lost = !won && guesses.length >= MAX_TRIES
  const over = won || lost

  function guess(c: Country) {
    if (over || !target) return
    const km = distanceKm(c.latlng, target.latlng)
    const g: Guess = {
      country: c,
      km: c.code === target.code ? 0 : km,
      dir: bearing(c.latlng, target.latlng),
      pct: c.code === target.code ? 100 : Math.max(0, Math.round((1 - km / MAX_DIST) * 100)),
    }
    const next = [...guesses, g]
    setGuesses(next)
    if (c.code === target.code) {
      const s = streak + 1
      setStreak(s)
      saveBest('siluetas', s)
    } else if (next.length >= MAX_TRIES) {
      setStreak(0)
    }
  }

  function newGame() {
    setTarget(pick(pool.filter((c) => c.code !== target?.code)))
    setGuesses([])
  }

  return (
    <GameLayout
      title="Siluetas"
      icon="shape"
      subtitle="Adivina el país por su forma. Te damos distancia y dirección."
      stats={
        <>
          <Stat label="Intento" value={`${Math.min(guesses.length + (over ? 0 : 1), MAX_TRIES)}/${MAX_TRIES}`} />
          <Stat label="Racha" value={streak} />
          <Stat label="Récord" value={getBest('siluetas')} />
        </>
      }
    >
      <div className="split">
        <div className="card center">
          <Silhouette feature={geo.byCode.get(target.code)!} />
          {over && (
            <div className="reveal">
              <img className="flag-small" src={flagUrl(target, 160)} alt="" />
              <strong>{target.name}</strong>
              <span>{won ? `¡Acertaste en ${guesses.length}!` : 'Se acabaron los intentos'}</span>
            </div>
          )}
        </div>
        <div className="card">
          {!over && (
            <CountryInput onSubmit={guess} exclude={new Set(guesses.map((g) => g.country.code))} />
          )}
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
                fill={(code) =>
                  code === target.code ? 'var(--good)' : guesses.some((g) => g.country.code === code) ? 'var(--warn)' : undefined
                }
              />
              <button className="btn primary" onClick={newGame}>
                Nuevo país →
              </button>
            </>
          )}
        </div>
      </div>
    </GameLayout>
  )
}

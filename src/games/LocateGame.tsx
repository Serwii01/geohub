import { useMemo, useState } from 'react'
import { GameLayout, Loading, Stat, type RegionOption } from '../components/GameLayout'
import { PlayBar, RoundResult, useRoundGame } from '../components/RoundGame'
import { WorldMap } from '../components/WorldMap'
import { BY_CODE, inRegion, type Country } from '../data/countries'
import { regionFit, useGeo, type GeoData } from '../data/geo'
import { useGameKeys } from '../lib/keys'
import { distanceKm, formatNumber, pick } from '../lib/utils'

const MAX = 1000

function poolFor(geo: GeoData, region: RegionOption) {
  // Los microestados quedan fuera: ni con zoom se distinguen bien
  const minArea = region === 'Mundo' ? 2000 : 300
  return inRegion(region).filter((c) => geo.byCode.has(c.code) && c.area >= minArea)
}

export function locatePoints(clicked: Country, target: Country) {
  return clicked.code === target.code
    ? MAX
    : Math.round(900 * Math.exp(-distanceKm(clicked.latlng, target.latlng) / 1500))
}

export default function LocateGame() {
  const geo = useGeo()
  const [notice, setNotice] = useState('')
  const game = useRoundGame<Country>({
    gameId: 'localiza',
    max: MAX,
    enabled: !!geo,
    subject: (c) => c.code,
    make: ({ rng, used, region }) => {
      const pool = poolFor(geo!, region)
      const fresh = pool.filter((c) => !used.has(c.code))
      return pick(fresh.length ? fresh : pool, rng)
    },
  })
  const fit = useMemo(() => (geo ? regionFit(geo, game.region) : undefined), [geo, game.region])
  useGameKeys({ onNext: game.given && !game.finished ? game.next : undefined })

  if (!geo || !game.q) return <GameLayout title="Localiza"><Loading /></GameLayout>

  const target = game.q
  const clicked = game.given?.v

  function select(code: string) {
    if (game.given) return
    const c = BY_CODE.get(code)
    if (!c) {
      setNotice('Eso es un territorio, no un país independiente. Prueba otra vez.')
      return
    }
    setNotice('')
    game.answer(code, locatePoints(c, target))
  }

  const fill = (code: string) => {
    if (!clicked) return undefined
    if (code === target.code) return 'var(--good)'
    if (code === clicked) return 'var(--bad)'
    return undefined
  }

  const clickedCountry = clicked ? BY_CODE.get(clicked) : undefined

  return (
    <GameLayout
      title="Localiza"
      subtitle="Pulsa el país que se pide. Usa la rueda o pellizca para hacer zoom y arrastra para moverte."
      stats={
        <>
          <Stat label="Ronda" value={`${game.index + 1}/${game.total === Infinity ? '∞' : game.total}`} />
          <Stat label="Puntos" value={formatNumber(game.score)} />
          {!game.daily && <Stat label="Récord" value={formatNumber(game.best)} />}
        </>
      }
    >
      <PlayBar game={game} />
      {game.finished ? (
        <RoundResult game={game} title="Localiza" format={(n) => formatNumber(n)} />
      ) : (
        <div className="card map-card">
          <div className="locate-bar">
            <span>
              Encuentra: <strong>{target.name}</strong>
            </span>
            {clickedCountry && (
              <span className={clicked === target.code ? 'ok' : 'ko'}>
                {clicked === target.code
                  ? `¡Correcto! +${game.given!.p}`
                  : `Eso es ${clickedCountry.name} · a ${formatNumber(distanceKm(clickedCountry.latlng, target.latlng))} km · +${game.given!.p}`}
              </span>
            )}
            {!clicked && notice && <span className="ko">{notice}</span>}
            <span className="locate-actions">
              {game.total === Infinity && game.answers.length > 0 && (
                <button className="btn" onClick={game.finish}>
                  Terminar
                </button>
              )}
              {clicked && (
                <button className="btn primary" onClick={game.next}>
                  {game.index + 1 >= game.total ? 'Ver resultado' : 'Siguiente →'} <kbd>Intro</kbd>
                </button>
              )}
            </span>
          </div>
          <WorldMap
            features={geo.all}
            fit={fit}
            fill={fill}
            onSelect={select}
            ring={clicked ? target.code : undefined}
            height={560}
            zoomable
          />
        </div>
      )}
    </GameLayout>
  )
}

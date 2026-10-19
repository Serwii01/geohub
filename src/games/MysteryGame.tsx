import { useEffect, useMemo, useState } from 'react'
import { CountryInput } from '../components/CountryInput'
import { GameLayout, Loading, Stat } from '../components/GameLayout'
import { PlayBar, RoundResult, useRoundGame } from '../components/RoundGame'
import { WorldMap } from '../components/WorldMap'
import { BY_CODE, flagUrl, inRegion, type Country } from '../data/countries'
import { regionFit, useGeo } from '../data/geo'
import { pick } from '../lib/utils'

const TRIES = 2

export default function MysteryGame() {
  const geo = useGeo()
  const game = useRoundGame<Country>({
    gameId: 'mapamudo',
    max: 2,
    enabled: !!geo,
    subject: (c) => c.code,
    make: ({ rng, used, region }) => {
      const pool = inRegion(region).filter((c) => geo!.byCode.has(c.code) && c.area >= 300)
      const fresh = pool.filter((c) => !used.has(c.code))
      return pick(fresh.length ? fresh : pool, rng)
    },
  })
  const [wrong, setWrong] = useState<string[]>([])
  const fit = useMemo(() => (geo ? regionFit(geo, game.region) : undefined), [geo, game.region])

  // Los fallos son de cada ronda
  useEffect(() => setWrong([]), [game.index, game.q])

  if (!geo || !game.q) return <GameLayout title="¿Qué país es?"><Loading /></GameLayout>

  const target = game.q
  const given = game.given
  const solved = !!given && given.p > 0

  function guess(c: Country) {
    if (given) return
    if (c.code === target.code) {
      game.answer(c.code, wrong.length === 0 ? 2 : 1)
    } else {
      const next = [...wrong, c.code]
      setWrong(next)
      if (next.length >= TRIES) game.answer(c.code, 0)
    }
  }

  const fill = (code: string) => {
    if (code === target.code) return given ? (solved ? 'var(--good)' : 'var(--bad)') : 'var(--primary)'
    if (wrong.includes(code)) return 'var(--warn)'
    return undefined
  }

  return (
    <GameLayout
      title="¿Qué país es?"
      subtitle="Escribe el nombre del país marcado. Acertar a la primera vale 2 puntos; a la segunda, 1."
      stats={
        <>
          <Stat label="Ronda" value={`${game.index + 1}/${game.total === Infinity ? '∞' : game.total}`} />
          <Stat label="Puntos" value={game.score} />
          {!game.daily && <Stat label="Récord" value={game.best} />}
        </>
      }
    >
      <PlayBar game={game} />
      {game.finished ? (
        <RoundResult game={game} title="¿Qué país es?" />
      ) : (
        <div className="split wide-map">
          <div className="card map-card">
            <WorldMap features={geo.all} fit={fit} fill={fill} ring={target.code} height={540} zoomable />
          </div>
          <div className="card">
            {given ? (
              <div className="reveal">
                <img className="flag-small" src={flagUrl(target, 160)} alt="" />
                <strong>{target.name}</strong>
                <span>{solved ? (given.p === 1 ? '+1 punto' : '+2 puntos') : 'Sin puntos esta vez'}</span>
                <button className="btn primary" onClick={game.next} autoFocus>
                  {game.index + 1 >= game.total ? 'Ver resultado' : 'Siguiente'}
                </button>
              </div>
            ) : (
              <>
                <p className="muted">
                  Intento {wrong.length + 1} de {TRIES}
                </p>
                <CountryInput key={game.index} onSubmit={guess} exclude={new Set(wrong)} />
              </>
            )}
            {game.total === Infinity && game.answers.length > 0 && (
              <button className="btn" onClick={game.finish}>
                Terminar
              </button>
            )}
            <ul className="chip-list">
              {wrong.map((c) => (
                <li key={c} className="missed">
                  {BY_CODE.get(c)!.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </GameLayout>
  )
}

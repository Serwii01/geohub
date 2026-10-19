import { useEffect, useMemo, useState } from 'react'
import { CountryInput } from '../components/CountryInput'
import { GameLayout, Loading, RegionPicker, Stat, type RegionOption } from '../components/GameLayout'
import { WorldMap } from '../components/WorldMap'
import { BY_CODE, flagUrl, inRegion, type Country } from '../data/countries'
import { regionFit, useGeo } from '../data/geo'
import { getBest, sample, saveBest } from '../lib/utils'

const ROUNDS = 10
const TRIES = 2

export default function MysteryGame() {
  const geo = useGeo()
  const [region, setRegion] = useState<RegionOption>('Mundo')
  const [targets, setTargets] = useState<Country[]>([])
  const [round, setRound] = useState(0)
  const [wrong, setWrong] = useState<string[]>([])
  const [solved, setSolved] = useState(false)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [record, setRecord] = useState(false)
  const bestKey = `mapamudo:${region}`

  const pool = useMemo(
    () => (geo ? inRegion(region).filter((c) => geo.byCode.has(c.code) && c.area >= 300) : []),
    [geo, region],
  )
  const fit = useMemo(() => (geo ? regionFit(geo, region) : undefined), [geo, region])

  function restart() {
    setTargets(sample(pool, ROUNDS))
    setRound(0)
    setWrong([])
    setSolved(false)
    setScore(0)
    setDone(false)
    setRecord(false)
  }

  useEffect(() => {
    restart()
  }, [pool]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!geo || !targets.length) return <GameLayout title="¿Qué país es?"><Loading /></GameLayout>

  const target = targets[round]
  const failed = !solved && wrong.length >= TRIES
  const answered = solved || failed

  function guess(c: Country) {
    if (answered) return
    if (c.code === target.code) {
      setSolved(true)
      setScore((s) => s + (wrong.length === 0 ? 2 : 1))
    } else {
      setWrong([...wrong, c.code])
    }
  }

  function next() {
    if (round + 1 >= targets.length) {
      setDone(true)
      setRecord(saveBest(bestKey, score))
    } else {
      setRound(round + 1)
      setWrong([])
      setSolved(false)
    }
  }

  const fill = (code: string) => {
    if (code === target.code) return answered ? (solved ? 'var(--good)' : 'var(--bad)') : 'var(--primary)'
    if (wrong.includes(code)) return 'var(--warn)'
    return undefined
  }

  return (
    <GameLayout
      title="¿Qué país es?"
      subtitle="Escribe el nombre del país marcado. Acertar a la primera vale 2 puntos; a la segunda, 1."
      stats={
        <>
          <Stat label="Ronda" value={`${round + 1}/${targets.length}`} />
          <Stat label="Puntos" value={score} />
          <Stat label="Récord" value={getBest(bestKey)} />
        </>
      }
    >
      <div className="toolbar">
        <RegionPicker value={region} onChange={setRegion} />
      </div>
      {done ? (
        <div className="card result">
          <h2>Resultado</h2>
          <p className="big">
            {score} / {targets.length * 2}
          </p>
          {record && <p className="record">Nuevo récord</p>}
          <button className="btn primary" onClick={restart}>
            Jugar otra vez
          </button>
        </div>
      ) : (
        <div className="split wide-map">
          <div className="card map-card">
            <WorldMap features={geo.all} fit={fit} fill={fill} ring={target.code} height={540} zoomable />
          </div>
          <div className="card">
            {answered ? (
              <div className="reveal">
                <img className="flag-small" src={flagUrl(target, 160)} alt="" />
                <strong>{target.name}</strong>
                <span>{solved ? (wrong.length ? '+1 punto' : '+2 puntos') : 'Sin puntos esta vez'}</span>
                <button className="btn primary" onClick={next} autoFocus>
                  {round + 1 >= targets.length ? 'Ver resultado' : 'Siguiente'}
                </button>
              </div>
            ) : (
              <>
                <p className="muted">Intento {wrong.length + 1} de {TRIES}</p>
                <CountryInput key={round} onSubmit={guess} exclude={new Set(wrong)} />
              </>
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

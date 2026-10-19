import { useEffect, useMemo, useState } from 'react'
import { GameLayout, Loading, RegionPicker, Stat, type RegionOption } from '../components/GameLayout'
import { WorldMap } from '../components/WorldMap'
import { BY_CODE, inRegion, type Country } from '../data/countries'
import { regionFit, useGeo } from '../data/geo'
import { distanceKm, formatNumber, getBest, saveBest, sample } from '../lib/utils'

const ROUNDS = 10

export default function LocateGame() {
  const geo = useGeo()
  const [region, setRegion] = useState<RegionOption>('Mundo')
  const [targets, setTargets] = useState<Country[]>([])
  const [round, setRound] = useState(0)
  const [clicked, setClicked] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [lastPoints, setLastPoints] = useState(0)
  const [done, setDone] = useState(false)
  const [record, setRecord] = useState(false)
  const bestKey = `localiza:${region}`

  const pool = useMemo(() => {
    if (!geo) return []
    // Los microestados quedan fuera: ni con zoom se distinguen bien
    const minArea = region === 'Mundo' ? 2000 : 300
    return inRegion(region).filter((c) => geo.byCode.has(c.code) && c.area >= minArea)
  }, [geo, region])

  const fit = useMemo(() => {
    if (!geo) return undefined
    return regionFit(geo, region)
  }, [geo, region])

  function restart() {
    setTargets(sample(pool, ROUNDS))
    setRound(0)
    setClicked(null)
    setScore(0)
    setDone(false)
    setRecord(false)
  }

  useEffect(() => {
    restart()
  }, [pool]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!geo || !targets.length) return <GameLayout title="Localiza"><Loading /></GameLayout>

  const target = targets[round]

  function select(code: string) {
    if (clicked || done) return
    const c = BY_CODE.get(code)
    if (!c) return
    setClicked(code)
    const pts = code === target.code ? 1000 : Math.round(900 * Math.exp(-distanceKm(c.latlng, target.latlng) / 1500))
    setLastPoints(pts)
    setScore((s) => s + pts)
  }

  function next() {
    if (round + 1 >= targets.length) {
      setDone(true)
      setRecord(saveBest(bestKey, score))
    } else {
      setRound(round + 1)
      setClicked(null)
    }
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
          <Stat label="Ronda" value={`${round + 1}/${targets.length}`} />
          <Stat label="Puntos" value={formatNumber(score)} />
          <Stat label="Récord" value={formatNumber(getBest(bestKey))} />
        </>
      }
    >
      <div className="toolbar">
        <RegionPicker value={region} onChange={setRegion} />
      </div>
      {done ? (
        <div className="card result">
          <h2>Resultado final</h2>
          <p className="big">{formatNumber(score)} pts</p>
          <p>de {formatNumber(targets.length * 1000)} posibles</p>
          {record && <p className="record">¡Nuevo récord!</p>}
          <button className="btn primary" onClick={restart}>
            Jugar otra vez
          </button>
        </div>
      ) : (
        <div className="card map-card">
          <div className="locate-bar">
            <span>
              Encuentra: <strong>{target.name}</strong>
            </span>
            {clicked && (
              <span className={clicked === target.code ? 'ok' : 'ko'}>
                {clicked === target.code
                  ? `¡Correcto! +${lastPoints}`
                  : `Eso es ${clickedCountry?.name} · a ${formatNumber(distanceKm(clickedCountry!.latlng, target.latlng))} km · +${lastPoints}`}
              </span>
            )}
            {clicked && (
              <button className="btn primary" onClick={next}>
                {round + 1 >= targets.length ? 'Ver resultado' : 'Siguiente →'}
              </button>
            )}
          </div>
          <WorldMap features={geo.all} fit={fit} fill={fill} onSelect={select} ring={clicked ? target.code : undefined} height={560} zoomable />
        </div>
      )}
    </GameLayout>
  )
}

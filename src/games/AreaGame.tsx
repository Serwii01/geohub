import { useState } from 'react'
import { GameLayout, Stat } from '../components/GameLayout'
import { COUNTRIES, flagUrl, type Country } from '../data/countries'
import { formatNumber, getBest, pick, saveBest } from '../lib/utils'

// Solo países con superficie razonablemente distinta para que no haya empates
const POOL = COUNTRIES.filter((c) => c.area > 0)

function nextOf(current: Country): Country {
  for (;;) {
    const c = pick(POOL)
    if (c.code !== current.code && Math.abs(c.area - current.area) / Math.max(c.area, current.area) > 0.03) return c
  }
}

export default function AreaGame() {
  const [left, setLeft] = useState<Country>(() => pick(POOL))
  const [right, setRight] = useState<Country>(() => nextOf(left))
  const [streak, setStreak] = useState(0)
  const [answer, setAnswer] = useState<'ok' | 'ko' | null>(null)
  const [record, setRecord] = useState(false)

  function guess(bigger: boolean) {
    if (answer) return
    const ok = bigger === right.area > left.area
    setAnswer(ok ? 'ok' : 'ko')
    if (ok) {
      setStreak(streak + 1)
      setTimeout(() => {
        setLeft(right)
        setRight(nextOf(right))
        setAnswer(null)
      }, 1200)
    } else {
      setRecord(saveBest('superficie', streak))
    }
  }

  function restart() {
    const l = pick(POOL)
    setLeft(l)
    setRight(nextOf(l))
    setStreak(0)
    setAnswer(null)
    setRecord(false)
  }

  return (
    <GameLayout
      title="¿Más grande o más pequeño?"
      subtitle="¿El país de la derecha tiene más o menos superficie?"
      stats={
        <>
          <Stat label="Racha" value={streak} />
          <Stat label="Récord" value={getBest('superficie')} />
        </>
      }
    >
      <div className="versus">
        <div className="vs-card">
          <img src={flagUrl(left, 640)} alt="" />
          <h2>{left.name}</h2>
          <p className="area">{formatNumber(left.area)} km²</p>
        </div>
        <div className="vs-badge">o</div>
        <div className={`vs-card ${answer ?? ''}`}>
          <img src={flagUrl(right, 640)} alt="" />
          <h2>{right.name}</h2>
          {answer ? (
            <p className="area">{formatNumber(right.area)} km²</p>
          ) : (
            <div className="vs-buttons">
              <button className="btn primary" onClick={() => guess(true)}>
                Más grande
              </button>
              <button className="btn" onClick={() => guess(false)}>
                Más pequeño
              </button>
            </div>
          )}
        </div>
      </div>
      {answer === 'ko' && (
        <div className="card result">
          <h2>Fin de la racha</h2>
          <p className="big">Racha: {streak}</p>
          {record && <p className="record">¡Nuevo récord!</p>}
          <button className="btn primary" onClick={restart}>
            Jugar otra vez
          </button>
        </div>
      )}
    </GameLayout>
  )
}

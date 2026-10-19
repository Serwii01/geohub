import { useEffect, useRef, useState } from 'react'
import { GameLayout, Stat } from '../components/GameLayout'
import { COUNTRIES, findCountry, flagUrl, type Country } from '../data/countries'
import { getBest, saveBest, shuffle } from '../lib/utils'

const TIME = 15 * 60
const BEST_KEY = 'todas-banderas'

function clock(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function AllFlagsGame() {
  const [order, setOrder] = useState<Country[]>(() => shuffle(COUNTRIES))
  const [current, setCurrent] = useState(order[0].code)
  const [found, setFound] = useState<Set<string>>(new Set())
  const [text, setText] = useState('')
  const [left, setLeft] = useState(TIME)
  const [status, setStatus] = useState<'idle' | 'playing' | 'over'>('idle')
  const [record, setRecord] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const tileRefs = useRef(new Map<string, HTMLButtonElement>())
  // Hora del último acierto: el Intro que se pulsa por costumbre justo después no debe saltar la siguiente
  const lastHit = useRef(0)

  useEffect(() => {
    if (status !== 'playing') return
    const id = setInterval(() => setLeft((l) => l - 1), 1000)
    return () => clearInterval(id)
  }, [status])

  useEffect(() => {
    if (status === 'playing' && (left <= 0 || found.size === order.length)) finish()
  }) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (status !== 'over') tileRefs.current.get(current)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [current, status])

  function finish() {
    setStatus('over')
    setRecord(saveBest(BEST_KEY, found.size))
  }

  /** Siguiente bandera sin acertar después de `from`, dando la vuelta al final */
  function nextPending(from: string, done: Set<string>) {
    const i = order.findIndex((c) => c.code === from)
    for (let k = 1; k <= order.length; k++) {
      const c = order[(i + k) % order.length]
      if (!done.has(c.code)) return c.code
    }
    return from
  }

  function onType(value: string) {
    if (status === 'over') return
    if (status === 'idle') setStatus('playing')
    const c = findCountry(value)
    if (c && c.code === current) {
      const next = new Set(found).add(c.code)
      lastHit.current = Date.now()
      setFound(next)
      setCurrent(nextPending(c.code, next))
      setText('')
    } else {
      setText(value)
    }
  }

  function skip() {
    setCurrent(nextPending(current, found))
    setText('')
    inputRef.current?.focus()
  }

  function select(code: string) {
    if (status === 'over' || found.has(code)) return
    setCurrent(code)
    setText('')
    inputRef.current?.focus()
  }

  function restart() {
    const o = shuffle(COUNTRIES)
    setOrder(o)
    setCurrent(o[0].code)
    setFound(new Set())
    setText('')
    setLeft(TIME)
    setStatus('idle')
    setRecord(false)
  }

  return (
    <GameLayout
      title="Todas las banderas"
      subtitle="Escribe el país de la bandera marcada. Pulsa Intro para saltarla o elige otra con un clic. Tienes 15 minutos."
      stats={
        <>
          <Stat label="Tiempo" value={clock(Math.max(0, left))} />
          <Stat label="Banderas" value={`${found.size}/${order.length}`} />
          <Stat label="Récord" value={getBest(BEST_KEY)} />
        </>
      }
    >
      <div className="flags-bar card">
        {status === 'over' ? (
          <div className="flags-result">
            <strong>
              {found.size === order.length ? 'Todas. Increíble.' : `${found.size} de ${order.length} banderas`}
            </strong>
            {record && <span className="record">Nuevo récord</span>}
            <button className="btn primary" onClick={restart}>
              Jugar otra vez
            </button>
          </div>
        ) : (
          <>
            <div className="country-input">
              <input
                ref={inputRef}
                value={text}
                autoFocus
                autoComplete="off"
                spellCheck={false}
                placeholder={status === 'idle' ? 'Escribe para empezar…' : '¿De qué país es la bandera marcada?'}
                onChange={(e) => onType(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (Date.now() - lastHit.current > 700) skip()
                  }
                }}
              />
            </div>
            <button className="btn" onClick={skip} disabled={status !== 'playing'}>
              Saltar
            </button>
            <button className="btn" onClick={finish} disabled={status !== 'playing'}>
              Terminar
            </button>
          </>
        )}
        <div className="progress">
          <div style={{ width: `${(found.size / order.length) * 100}%` }} />
        </div>
      </div>

      <div className="flag-grid">
        {order.map((c) => {
          const ok = found.has(c.code)
          const cls = ok ? 'found' : status === 'over' ? 'missed' : c.code === current ? 'current' : ''
          return (
            <button
              key={c.code}
              ref={(el) => {
                if (el) tileRefs.current.set(c.code, el)
              }}
              className={`flag-tile ${cls}`}
              onClick={() => select(c.code)}
            >
              <img src={flagUrl(c, 160)} alt="" loading="lazy" draggable={false} />
              <span>{ok || status === 'over' ? c.name : ''}</span>
            </button>
          )
        })}
      </div>
    </GameLayout>
  )
}

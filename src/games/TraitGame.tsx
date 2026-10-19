import { useEffect, useState } from 'react'
import { GameLayout, RegionPicker, Stat, type RegionOption } from '../components/GameLayout'
import { flagUrl, inRegion, type Country } from '../data/countries'
import { getBest, pick, sample, saveBest, shuffle } from '../lib/utils'

const ROUNDS = 10

type Mode = 'moneda' | 'idioma'

const MODES: Record<Mode, { label: string; question: string; values: (c: Country) => string[] }> = {
  moneda: { label: 'Monedas', question: '¿Qué moneda se usa en…', values: (c) => c.currencies },
  idioma: { label: 'Idiomas', question: '¿Qué idioma es oficial en…', values: (c) => c.languages },
}

interface Question {
  target: Country
  answer: string
  options: string[]
}

/**
 * Pregunta sobre un rasgo (moneda o idioma). Los distractores son valores que el país
 * NO tiene, sacados primero de su continente para que no sea evidente.
 */
export function makeTraitQuestion(
  pool: Country[],
  values: (c: Country) => string[],
  used: Set<string>,
  rng: () => number = Math.random,
): Question {
  const candidates = pool.filter((c) => values(c).length > 0 && !used.has(c.code))
  const target = pick(candidates.length ? candidates : pool.filter((c) => values(c).length), rng)
  const own = new Set(values(target))
  const answer = pick([...own], rng)
  const others = (list: Country[]) => [...new Set(list.flatMap(values))].filter((v) => !own.has(v))
  const near = others(pool.filter((c) => c.region === target.region))
  const options = sample(near, 3, rng)
  if (options.length < 3) {
    const far = others(pool).filter((v) => !options.includes(v))
    options.push(...sample(far, 3 - options.length, rng))
  }
  return { target, answer, options: shuffle([answer, ...options], rng) }
}

export default function TraitGame() {
  const [mode, setMode] = useState<Mode>('moneda')
  const [region, setRegion] = useState<RegionOption>('Mundo')
  const pool = inRegion(region)
  const { values, question } = MODES[mode]
  const [round, setRound] = useState(1)
  const [score, setScore] = useState(0)
  const [used, setUsed] = useState<Set<string>>(new Set())
  const [q, setQ] = useState<Question>(() => makeTraitQuestion(pool, values, new Set()))
  const [chosen, setChosen] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [record, setRecord] = useState(false)
  const bestKey = `rasgos-${mode}:${region}`

  function restart() {
    setRound(1)
    setScore(0)
    setUsed(new Set())
    setQ(makeTraitQuestion(pool, values, new Set()))
    setChosen(null)
    setDone(false)
    setRecord(false)
  }

  useEffect(() => {
    restart()
  }, [mode, region]) // eslint-disable-line react-hooks/exhaustive-deps

  function choose(v: string) {
    if (chosen) return
    setChosen(v)
    if (v === q.answer) setScore((s) => s + 1)
  }

  function next() {
    if (round >= ROUNDS) {
      setDone(true)
      setRecord(saveBest(bestKey, score))
      return
    }
    const u = new Set(used).add(q.target.code)
    setUsed(u)
    setQ(makeTraitQuestion(pool, values, u))
    setChosen(null)
    setRound(round + 1)
  }

  const others = values(q.target).filter((v) => v !== q.answer)

  return (
    <GameLayout
      title="Monedas e idiomas"
      subtitle="Elige la moneda o el idioma oficial de cada país."
      stats={
        <>
          <Stat label="Ronda" value={`${Math.min(round, ROUNDS)}/${ROUNDS}`} />
          <Stat label="Aciertos" value={score} />
          <Stat label="Récord" value={getBest(bestKey)} />
        </>
      }
    >
      <div className="toolbar">
        <RegionPicker value={region} onChange={setRegion} />
        <div className="chips">
          {(Object.keys(MODES) as Mode[]).map((m) => (
            <button key={m} className={`chip ${mode === m ? 'on' : ''}`} onClick={() => setMode(m)}>
              {MODES[m].label}
            </button>
          ))}
        </div>
      </div>

      {done ? (
        <div className="card result">
          <h2>Resultado</h2>
          <p className="big">
            {score} / {ROUNDS}
          </p>
          {record && <p className="record">Nuevo récord</p>}
          <button className="btn primary" onClick={restart}>
            Jugar otra vez
          </button>
        </div>
      ) : (
        <div className="card quiz">
          <p className="question">{question}</p>
          <div className="prompt">
            <div className="prompt-country">
              <img className="flag-small" src={flagUrl(q.target, 160)} alt="" />
              <span>{q.target.name}?</span>
            </div>
          </div>
          <div className="options">
            {q.options.map((v) => {
              let cls = 'option'
              if (chosen) cls += v === q.answer ? ' correct' : v === chosen ? ' wrong' : ' dim'
              return (
                <button key={v} className={cls} onClick={() => choose(v)}>
                  {v}
                </button>
              )
            })}
          </div>
          {chosen && others.length > 0 && (
            <p className="muted">También: {others.join(', ')}</p>
          )}
          {chosen && (
            <button className="btn primary next" onClick={next} autoFocus>
              {round >= ROUNDS ? 'Ver resultado' : 'Siguiente →'}
            </button>
          )}
        </div>
      )}
    </GameLayout>
  )
}

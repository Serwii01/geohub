import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { inRegion, type Country } from '../data/countries'
import { getBest, pick, sample, saveBest, shuffle } from '../lib/utils'
import type { IconName } from './Icons'
import { GameLayout, RegionPicker, Stat, type RegionOption } from './GameLayout'

const ROUNDS = 10

interface Props {
  gameId: string
  title: string
  icon: IconName
  subtitle: string
  prompt: (target: Country) => ReactNode
  label: (c: Country) => ReactNode
  question?: string
  filter?: (c: Country) => boolean
  toolbar?: ReactNode
  resetKey?: string
}

interface Question {
  target: Country
  options: Country[]
}

function makeQuestion(pool: Country[], used: Set<string>): Question {
  const fresh = pool.filter((c) => !used.has(c.code))
  const target = pick(fresh.length ? fresh : pool)
  // Distractores: preferentemente de la misma región para que no sea trivial
  const near = pool.filter((c) => c.code !== target.code && c.region === target.region)
  const far = pool.filter((c) => c.code !== target.code && c.region !== target.region)
  const distractors = sample(near, 3)
  if (distractors.length < 3) distractors.push(...sample(far, 3 - distractors.length))
  return { target, options: shuffle([target, ...distractors]) }
}

export function Quiz({ gameId, title, icon, subtitle, prompt, label, question, filter, toolbar, resetKey }: Props) {
  const [region, setRegion] = useState<RegionOption>('Mundo')
  const pool = inRegion(region).filter((c) => (filter ? filter(c) : true))
  const [round, setRound] = useState(1)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [used, setUsed] = useState<Set<string>>(new Set())
  const [q, setQ] = useState<Question>(() => makeQuestion(pool, new Set()))
  const [chosen, setChosen] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [record, setRecord] = useState(false)
  const bestKey = `${gameId}:${region}`

  const restart = useCallback(() => {
    setRound(1)
    setScore(0)
    setStreak(0)
    setUsed(new Set())
    setQ(makeQuestion(pool, new Set()))
    setChosen(null)
    setDone(false)
    setRecord(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, resetKey])

  useEffect(() => {
    restart()
  }, [restart])

  function choose(c: Country) {
    if (chosen) return
    setChosen(c.code)
    if (c.code === q.target.code) {
      setScore((s) => s + 1)
      setStreak((s) => s + 1)
    } else {
      setStreak(0)
    }
  }

  function next() {
    if (round >= ROUNDS) {
      setDone(true)
      setRecord(saveBest(bestKey, score))
      return
    }
    const u = new Set(used).add(q.target.code)
    setUsed(u)
    setQ(makeQuestion(pool, u))
    setChosen(null)
    setRound((r) => r + 1)
  }

  return (
    <GameLayout
      title={title}
      icon={icon}
      subtitle={subtitle}
      stats={
        <>
          <Stat label="Ronda" value={`${Math.min(round, ROUNDS)}/${ROUNDS}`} />
          <Stat label="Aciertos" value={score} />
          <Stat label="Racha" value={streak} />
          <Stat label="Récord" value={getBest(bestKey)} />
        </>
      }
    >
      <div className="toolbar">
        <RegionPicker value={region} onChange={setRegion} />
        {toolbar}
      </div>

      {done ? (
        <div className="card result">
          <h2>{score >= 8 ? 'Impecable' : score >= 5 ? 'Bien jugado' : 'Sigue practicando'}</h2>
          <p className="big">
            {score} / {ROUNDS}
          </p>
          {record && <p className="record">¡Nuevo récord!</p>}
          <button className="btn primary" onClick={restart}>
            Jugar otra vez
          </button>
        </div>
      ) : (
        <div className="card quiz">
          {question && <p className="question">{question}</p>}
          <div className="prompt">{prompt(q.target)}</div>
          <div className="options">
            {q.options.map((c) => {
              let cls = 'option'
              if (chosen) {
                if (c.code === q.target.code) cls += ' correct'
                else if (c.code === chosen) cls += ' wrong'
                else cls += ' dim'
              }
              return (
                <button key={c.code} className={cls} onClick={() => choose(c)}>
                  {label(c)}
                </button>
              )
            })}
          </div>
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

import { useState } from 'react'
import { GameLayout, Stat } from '../components/GameLayout'
import { PlayBar, RoundResult, useRoundGame } from '../components/RoundGame'
import { flagUrl, inRegion, type Country } from '../data/countries'
import { distractorSource, type Difficulty } from '../lib/difficulty'
import { useGameKeys } from '../lib/keys'
import { pick, sample, shuffle } from '../lib/utils'

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
  difficulty: Difficulty = 'normal',
): Question {
  const candidates = pool.filter((c) => values(c).length > 0 && !used.has(c.code))
  const target = pick(candidates.length ? candidates : pool.filter((c) => values(c).length), rng)
  const own = new Set(values(target))
  const answer = pick([...own], rng)
  const others = (list: Country[]) => [...new Set(list.flatMap(values))].filter((v) => !own.has(v))
  // Dificultad: de dónde salen las opciones falsas (otros continentes, el mismo o los vecinos)
  const near = others(distractorSource(target, pool, difficulty, 4))
  const options = sample(near, 3, rng)
  if (options.length < 3) {
    const far = others(pool).filter((v) => !options.includes(v))
    options.push(...sample(far, 3 - options.length, rng))
  }
  return { target, answer, options: shuffle([answer, ...options], rng) }
}

export default function TraitGame() {
  const [mode, setMode] = useState<Mode>('moneda')
  const { values, question } = MODES[mode]
  const game = useRoundGame<Question>({
    gameId: `rasgos-${mode}`,
    max: 1,
    deps: [mode],
    withDifficulty: true,
    subject: (q) => q.target.code,
    make: ({ rng, used, region, difficulty }) => makeTraitQuestion(inRegion(region), values, used, rng, difficulty),
  })
  const { q, given } = game
  const others = q && given ? values(q.target).filter((v) => v !== q.answer) : []

  useGameKeys({
    onOption:
      q && !given && !game.finished
        ? (i) => {
            const v = q.options[i]
            if (v) game.answer(v, v === q.answer ? 1 : 0)
          }
        : undefined,
    onNext: given && !game.finished ? game.next : undefined,
  })

  return (
    <GameLayout
      title="Monedas e idiomas"
      subtitle="Elige la moneda o el idioma oficial de cada país."
      stats={
        <>
          <Stat label="Ronda" value={`${game.index + 1}/${game.total === Infinity ? '∞' : game.total}`} />
          <Stat label="Aciertos" value={game.score} />
          {!game.daily && <Stat label="Récord" value={game.best} />}
        </>
      }
    >
      <PlayBar game={game}>
        <div className="chips">
          {(Object.keys(MODES) as Mode[]).map((m) => (
            <button key={m} className={`chip ${mode === m ? 'on' : ''}`} onClick={() => setMode(m)}>
              {MODES[m].label}
            </button>
          ))}
        </div>
      </PlayBar>

      {game.finished ? (
        <RoundResult game={game} title={MODES[mode].label} />
      ) : (
        q && (
          <div className="card quiz">
            <p className="question">{question}</p>
            <div className="prompt">
              <div className="prompt-country">
                <img className="flag-small" src={flagUrl(q.target, 160)} alt="" />
                <span>{q.target.name}?</span>
              </div>
            </div>
            <div className="options">
              {q.options.map((v, i) => {
                let cls = 'option'
                if (given) cls += v === q.answer ? ' correct' : v === given.v ? ' wrong' : ' dim'
                return (
                  <button key={v} className={cls} onClick={() => game.answer(v, v === q.answer ? 1 : 0)}>
                    <kbd>{i + 1}</kbd>
                    {v}
                  </button>
                )
              })}
            </div>
            {others.length > 0 && <p className="muted">También: {others.join(', ')}</p>}
            <div className="quiz-actions">
              {given && (
                <button className="btn primary" onClick={game.next}>
                  {game.index + 1 >= game.total ? 'Ver resultado' : 'Siguiente →'} <kbd>Intro</kbd>
                </button>
              )}
              {game.total === Infinity && game.answers.length > 0 && (
                <button className="btn" onClick={game.finish}>
                  Terminar
                </button>
              )}
            </div>
          </div>
        )
      )}
    </GameLayout>
  )
}

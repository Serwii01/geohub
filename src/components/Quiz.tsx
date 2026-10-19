import type { ReactNode } from 'react'
import { inRegion, type Country } from '../data/countries'
import { distractorCountries, type Difficulty } from '../lib/difficulty'
import { useGameKeys } from '../lib/keys'
import { pick, shuffle, type Rng } from '../lib/utils'
import { GameLayout, Stat } from './GameLayout'
import { PlayBar, RoundResult, useRoundGame } from './RoundGame'

interface Props {
  gameId: string
  title: string
  subtitle: string
  prompt: (target: Country) => ReactNode
  label: (c: Country) => ReactNode
  question?: string
  filter?: (c: Country) => boolean
  toolbar?: ReactNode
  optionsClass?: string
  /** Cambia cuando cambia el submodo del juego (reinicia la partida) */
  resetKey?: string
}

export interface Question {
  target: Country
  options: Country[]
}

export function makeQuestion(
  pool: Country[],
  used: Set<string>,
  rng: Rng = Math.random,
  difficulty: Difficulty = 'normal',
): Question {
  const fresh = pool.filter((c) => !used.has(c.code))
  const target = pick(fresh.length ? fresh : pool, rng)
  const distractors = distractorCountries(target, pool, difficulty, rng)
  return { target, options: shuffle([target, ...distractors], rng) }
}

export function Quiz({ gameId, title, subtitle, prompt, label, question, filter, toolbar, optionsClass, resetKey }: Props) {
  const game = useRoundGame<Question>({
    gameId,
    max: 1,
    deps: [resetKey],
    subject: (q) => q.target.code,
    withDifficulty: true,
    make: ({ rng, used, region, difficulty }) =>
      makeQuestion(
        inRegion(region).filter((c) => (filter ? filter(c) : true)),
        used,
        rng,
        difficulty,
      ),
  })
  const { q, given } = game

  useGameKeys({
    onOption:
      q && !given && !game.finished
        ? (i) => {
            const c = q.options[i]
            if (c) game.answer(c.code, c.code === q.target.code ? 1 : 0)
          }
        : undefined,
    onNext: given && !game.finished ? game.next : undefined,
  })

  return (
    <GameLayout
      title={title}
      subtitle={subtitle}
      stats={
        <>
          <Stat label="Ronda" value={`${game.index + 1}/${game.total === Infinity ? '∞' : game.total}`} />
          <Stat label="Aciertos" value={game.score} />
          <Stat label="Racha" value={game.streak} />
          {!game.daily && <Stat label="Récord" value={game.best} />}
        </>
      }
    >
      <PlayBar game={game}>{toolbar}</PlayBar>

      {game.finished ? (
        <RoundResult game={game} title={title} />
      ) : (
        q && (
          <div className="card quiz">
            {question && <p className="question">{question}</p>}
            <div className="prompt">{prompt(q.target)}</div>
            <div className={`options ${optionsClass ?? ''}`}>
              {q.options.map((c, i) => {
                let cls = 'option'
                if (given) {
                  if (c.code === q.target.code) cls += ' correct'
                  else if (c.code === given.v) cls += ' wrong'
                  else cls += ' dim'
                }
                return (
                  <button key={c.code} className={cls} onClick={() => game.answer(c.code, c.code === q.target.code ? 1 : 0)}>
                    <kbd>{i + 1}</kbd>
                    {label(c)}
                  </button>
                )
              })}
            </div>
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

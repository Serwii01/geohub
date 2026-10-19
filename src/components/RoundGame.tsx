import { useEffect, useState, type ReactNode } from 'react'
import { RegionPicker, type RegionOption } from './GameLayout'
import {
  dailyKey,
  dailyRng,
  load,
  shareResult,
  shareText,
  square,
  store,
  todayKey,
  untilMidnight,
  usePref,
  type DailyRecord,
  type PlayMode,
  type Rounds,
} from '../lib/daily'
import { getBest, saveBest, type Rng } from '../lib/utils'

export const DAILY_ROUNDS = 10

export interface Answer {
  /** Lo que eligió el jugador */
  v: string
  /** Puntos obtenidos (0…max) */
  p: number
}

interface Options<Q> {
  /** Identificador para récords y diario (p. ej. "banderas") */
  gameId: string
  /** Genera una pregunta nueva sin repetir los sujetos de `used` */
  make: (ctx: { rng: Rng; used: Set<string>; region: RegionOption }) => Q
  /** Código del país sobre el que trata la pregunta */
  subject: (q: Q) => string
  /** Puntos máximos por pregunta */
  max: number
  /** Falso mientras falten datos (p. ej. el mapa) */
  enabled?: boolean
  /** Otros valores que, al cambiar, reinician la partida */
  deps?: unknown[]
}

/**
 * Estado compartido de los juegos por rondas: modo libre (10 rondas o infinito,
 * con filtro por continente) y modo diario (10 preguntas iguales para todos,
 * se guarda el progreso y solo se juega una vez al día).
 */
export function useRoundGame<Q>({ gameId, make, subject, max, enabled = true, deps = [] }: Options<Q>) {
  const [playMode, setPlayMode] = usePref<PlayMode>(`geohub:modo:${gameId.split('-')[0]}`, 'libre')
  const [rounds, setRounds] = usePref<Rounds>('geohub:rondas', 10)
  const [regionPref, setRegion] = useState<RegionOption>('Mundo')
  const daily = playMode === 'diario'
  const region: RegionOption = daily ? 'Mundo' : regionPref
  const date = todayKey()
  const total = daily ? DAILY_ROUNDS : rounds === 'inf' ? Infinity : 10
  const bestKey = `${gameId}:${region}${rounds === 'inf' ? ':inf' : ''}`

  const [questions, setQuestions] = useState<Q[]>([])
  const [answers, setAnswers] = useState<Answer[]>([])
  const [index, setIndex] = useState(0)
  const [finished, setFinished] = useState(false)
  const [record, setRecord] = useState(false)

  function start() {
    if (!enabled) return
    setRecord(false)
    if (daily) {
      // Se generan todas de golpe con la semilla del día para que sean deterministas
      const rng = dailyRng(gameId, date)
      const used = new Set<string>()
      const qs: Q[] = []
      for (let i = 0; i < DAILY_ROUNDS; i++) {
        const q = make({ rng, used, region: 'Mundo' })
        used.add(subject(q))
        qs.push(q)
      }
      const saved = load<DailyRecord<Answer[]> | null>(dailyKey(gameId, date), null)
      const prev = saved?.progress ?? []
      setQuestions(qs)
      setAnswers(prev)
      setIndex(Math.min(prev.length, DAILY_ROUNDS - 1))
      setFinished(saved?.done ?? false)
    } else {
      setQuestions([make({ rng: Math.random, used: new Set(), region })])
      setAnswers([])
      setIndex(0)
      setFinished(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(start, [enabled, playMode, rounds, regionPref, ...deps])

  const score = answers.reduce((s, a) => s + (a?.p ?? 0), 0)
  const squares = answers.map((a) => square(a.p / max)).join('')
  // Racha de aciertos al final de la partida
  let streak = 0
  for (let i = answers.length - 1; i >= 0 && answers[i]?.p > 0; i--) streak++

  function saveDaily(next: Answer[], done: boolean) {
    const s = next.reduce((t, a) => t + a.p, 0)
    const rec: DailyRecord<Answer[]> = {
      done,
      score: s,
      max: DAILY_ROUNDS * max,
      squares: next.map((a) => square(a.p / max)).join(''),
      progress: next,
    }
    store(dailyKey(gameId, date), rec)
  }

  function answer(v: string, p: number) {
    if (finished || answers[index]) return
    const next = [...answers]
    next[index] = { v, p }
    setAnswers(next)
    if (daily) saveDaily(next, false)
  }

  function finish() {
    setFinished(true)
    if (daily) saveDaily(answers, true)
    else setRecord(saveBest(bestKey, score))
  }

  function next() {
    if (index + 1 >= total) return finish()
    if (questions.length <= index + 1) {
      const used = new Set(questions.map(subject))
      setQuestions([...questions, make({ rng: Math.random, used, region })])
    }
    setIndex(index + 1)
  }

  return {
    playMode,
    setPlayMode,
    rounds,
    setRounds,
    region,
    setRegion,
    daily,
    date,
    total,
    q: questions[index] as Q | undefined,
    given: answers[index] as Answer | undefined,
    index,
    answers,
    score,
    streak,
    squares,
    finished,
    record,
    best: getBest(bestKey),
    maxPerRound: max,
    answer,
    next,
    finish,
    restart: start,
  }
}

export type RoundGame<Q> = ReturnType<typeof useRoundGame<Q>>

/**
 * Modo diario de los juegos de un solo reto (Siluetas, Rutas, Vecinos): guarda el
 * progreso del día y da un generador con la semilla del día.
 */
export function useDailyPuzzle<P>(gameId: string) {
  const [playMode, setPlayMode] = usePref<PlayMode>(`geohub:modo:${gameId}`, 'libre')
  const date = todayKey()
  const key = dailyKey(gameId, date)
  const [record, setRecord] = useState<DailyRecord<P> | null>(() => load(key, null))
  useEffect(() => setRecord(load(key, null)), [key, playMode])

  return {
    playMode,
    setPlayMode,
    daily: playMode === 'diario',
    date,
    rng: () => dailyRng(gameId, date),
    record,
    save(r: DailyRecord<P>) {
      store(key, r)
      setRecord(r)
    },
  }
}

/** Barra de modo: continente + libre/diario + 10 rondas/infinito */
export function PlayBar({
  game,
  showRegion = true,
  children,
}: {
  game: Pick<RoundGame<unknown>, 'playMode' | 'setPlayMode' | 'rounds' | 'setRounds' | 'region' | 'setRegion' | 'daily'>
  showRegion?: boolean
  children?: ReactNode
}) {
  return (
    <div className="toolbar">
      {showRegion && !game.daily ? <RegionPicker value={game.region} onChange={game.setRegion} /> : <span />}
      <div className="toolbar-right">
        {children}
        <ModeSwitch value={game.playMode} onChange={game.setPlayMode} />
        {!game.daily && (
          <div className="chips">
            <button className={`chip ${game.rounds === 10 ? 'on' : ''}`} onClick={() => game.setRounds(10)}>
              10 rondas
            </button>
            <button className={`chip ${game.rounds === 'inf' ? 'on' : ''}`} onClick={() => game.setRounds('inf')}>
              Infinito
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function ModeSwitch({ value, onChange }: { value: PlayMode; onChange: (m: PlayMode) => void }) {
  return (
    <div className="chips">
      <button className={`chip ${value === 'libre' ? 'on' : ''}`} onClick={() => onChange('libre')}>
        Libre
      </button>
      <button className={`chip ${value === 'diario' ? 'on' : ''}`} onClick={() => onChange('diario')}>
        Diario
      </button>
    </div>
  )
}

/** Pantalla final común: resultado, récord (libre) o compartir (diario) */
export function RoundResult({
  game,
  title,
  format = (n) => String(n),
}: {
  game: RoundGame<unknown>
  title: string
  format?: (n: number) => string
}) {
  if (game.daily) {
    return (
      <DailyResult
        title={title}
        date={game.date}
        squares={game.squares}
        score={`${format(game.score)}`}
        onFree={() => game.setPlayMode('libre')}
      />
    )
  }
  return (
    <div className="card result">
      <h2>Resultado</h2>
      <p className="big">
        {format(game.score)}
        {game.total !== Infinity && <small> / {format(game.total * game.maxPerRound)}</small>}
      </p>
      {game.total === Infinity && <p className="muted">{game.answers.length} preguntas respondidas</p>}
      {game.record && <p className="record">Nuevo récord</p>}
      <button className="btn primary" onClick={game.restart}>
        Jugar otra vez
      </button>
    </div>
  )
}

export function DailyResult({
  title,
  date,
  squares,
  score,
  onFree,
}: {
  title: string
  date: string
  squares: string
  score: string
  onFree?: () => void
}) {
  const [status, setStatus] = useState('')
  return (
    <div className="card result">
      <p className="muted">Diario de hoy completado</p>
      <p className="big">{score}</p>
      <p className="squares">{squares}</p>
      <div className="result-actions">
        <button
          className="btn primary"
          onClick={async () => {
            const r = await shareResult(shareText(title, date, squares, score))
            setStatus(r === 'copied' ? 'Copiado al portapapeles' : '')
          }}
        >
          Compartir
        </button>
        {onFree && (
          <button className="btn" onClick={onFree}>
            Jugar en modo libre
          </button>
        )}
      </div>
      {status && <p className="muted">{status}</p>}
      <p className="muted">Nuevo diario en {untilMidnight()}</p>
    </div>
  )
}

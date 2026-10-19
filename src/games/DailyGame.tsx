import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { GameLayout, Stat } from '../components/GameLayout'
import { Silhouette } from '../components/Silhouette'
import { COUNTRIES, flagUrl, type Country } from '../data/countries'
import { useGeo } from '../data/geo'
import { formatNumber, pick, sample, seededRng, shuffle, type Rng } from '../lib/utils'
import { makeTraitQuestion } from './TraitGame'

interface DailyQuestion {
  kind: string
  title: string
  prompt: () => ReactNode
  options: { value: string; label: ReactNode }[]
  answer: string
}

function today(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function yesterday() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return today(d)
}

/** Tres distractores del mismo continente que `target` */
function countryOptions(target: Country, pool: Country[], rng: Rng) {
  const near = pool.filter((c) => c.code !== target.code && c.region === target.region)
  return shuffle([target, ...sample(near, 3, rng)], rng).map((c) => ({ value: c.code, label: c.name }))
}

function buildDaily(date: string): DailyQuestion[] {
  const rng = seededRng(`geohub-${date}`)
  const used = new Set<string>()
  const fresh = (list: Country[]) => {
    const c = pick(
      list.filter((x) => !used.has(x.code)),
      rng,
    )
    used.add(c.code)
    return c
  }

  const flag = fresh(COUNTRIES)
  // Tuvalu no tiene forma en el atlas; los países diminutos no se reconocen como silueta
  const shape = fresh(COUNTRIES.filter((c) => c.code !== 'TUV' && c.area >= 20000))
  const capital = fresh(COUNTRIES.filter((c) => c.capital))
  const big = COUNTRIES.filter((c) => c.area >= 1000)
  const a = fresh(big)
  const b = fresh(big.filter((c) => Math.abs(c.area - a.area) / Math.max(c.area, a.area) > 0.1))
  const money = makeTraitQuestion(COUNTRIES, (c) => c.currencies, used, rng)
  used.add(money.target.code)
  const lang = makeTraitQuestion(COUNTRIES, (c) => c.languages, used, rng)

  const capitalNear = COUNTRIES.filter((c) => c.code !== capital.code && c.region === capital.region && c.capital)

  return [
    {
      kind: 'Bandera',
      title: '¿De qué país es esta bandera?',
      prompt: () => <img className="flag-big" src={flagUrl(flag, 640)} alt="Bandera del día" />,
      options: countryOptions(flag, COUNTRIES, rng),
      answer: flag.code,
    },
    {
      kind: 'Silueta',
      title: '¿Qué país tiene esta forma?',
      prompt: () => <DailySilhouette code={shape.code} />,
      options: countryOptions(shape, COUNTRIES, rng),
      answer: shape.code,
    },
    {
      kind: 'Capital',
      title: `¿Cuál es la capital de ${capital.name}?`,
      prompt: () => <img className="flag-big small" src={flagUrl(capital, 320)} alt="" />,
      options: shuffle([capital, ...sample(capitalNear, 3, rng)], rng).map((c) => ({ value: c.code, label: c.capital })),
      answer: capital.code,
    },
    {
      kind: 'Superficie',
      title: '¿Cuál de los dos es más grande?',
      prompt: () => null,
      options: [a, b].map((c) => ({
        value: c.code,
        label: (
          <span className="daily-versus">
            <img src={flagUrl(c, 160)} alt="" />
            {c.name}
          </span>
        ),
      })),
      answer: a.area > b.area ? a.code : b.code,
    },
    {
      kind: 'Moneda',
      title: `¿Qué moneda se usa en ${money.target.name}?`,
      prompt: () => <img className="flag-big small" src={flagUrl(money.target, 320)} alt="" />,
      options: money.options.map((v) => ({ value: v, label: v })),
      answer: money.answer,
    },
    {
      kind: 'Idioma',
      title: `¿Qué idioma es oficial en ${lang.target.name}?`,
      prompt: () => <img className="flag-big small" src={flagUrl(lang.target, 320)} alt="" />,
      options: lang.options.map((v) => ({ value: v, label: v })),
      answer: lang.answer,
    },
  ]
}

function DailySilhouette({ code }: { code: string }) {
  const geo = useGeo()
  const f = geo?.byCode.get(code)
  return f ? <Silhouette feature={f} className="silhouette daily-shape" /> : <div className="daily-shape" />
}

// ---------- Persistencia ----------
interface Streak {
  last: string
  current: number
  best: number
}

function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* almacenamiento no disponible */
  }
}

function untilMidnight() {
  const now = new Date()
  const next = new Date(now)
  next.setHours(24, 0, 0, 0)
  const s = Math.floor((next.getTime() - now.getTime()) / 1000)
  return `${Math.floor(s / 3600)} h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')} min`
}

export default function DailyGame() {
  const date = today()
  const questions = useMemo(() => buildDaily(date), [date])
  const answersKey = `geohub:daily:${date}`
  const [answers, setAnswers] = useState<string[]>(() => load(answersKey, []))
  const [streak, setStreak] = useState<Streak>(() => load('geohub:daily-streak', { last: '', current: 0, best: 0 }))
  // Índice de la pregunta visible; questions.length = pantalla de resultado
  const [index, setIndex] = useState(() => answers.length)
  const [copied, setCopied] = useState(false)
  const [, tick] = useState(0)

  const done = answers.length === questions.length
  const score = answers.filter((a, i) => a === questions[i].answer).length

  useEffect(() => {
    const id = setInterval(() => tick((t) => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  function answer(value: string) {
    if (answers.length > index) return
    const next = [...answers, value]
    setAnswers(next)
    save(answersKey, next)
    if (next.length === questions.length && streak.last !== date) {
      const current = streak.last === yesterday() ? streak.current + 1 : 1
      const s = { last: date, current, best: Math.max(streak.best, current) }
      setStreak(s)
      save('geohub:daily-streak', s)
    }
  }

  const squares = answers.map((a, i) => (a === questions[i].answer ? '🟩' : '🟥')).join('')
  const [y, m, d] = date.split('-')
  const shareText = `GeoHub · Reto diario ${d}/${m}/${y}\n${squares} ${score}/${questions.length}\n${location.origin}/reto-diario`

  async function share() {
    try {
      if (navigator.share) await navigator.share({ text: shareText })
      else {
        await navigator.clipboard.writeText(shareText)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      /* el usuario canceló */
    }
  }

  const q = questions[Math.min(index, questions.length - 1)]
  const given = answers[index]

  return (
    <GameLayout
      title="Reto diario"
      subtitle="Seis preguntas, las mismas para todo el mundo. Una partida al día."
      stats={
        <>
          <Stat label="Pregunta" value={`${Math.min(answers.length + (done ? 0 : 1), questions.length)}/${questions.length}`} />
          <Stat label="Racha" value={`${streak.current} ${streak.current === 1 ? "día" : "días"}`} />
          <Stat label="Mejor racha" value={streak.best} />
        </>
      }
    >
      <ol className="daily-steps">
        {questions.map((x, i) => {
          const a = answers[i]
          const cls = [a === undefined ? '' : a === x.answer ? 'ok' : 'ko', i === index ? 'now' : ''].join(' ')
          return (
            <li key={i} className={cls}>
              <button onClick={() => (a !== undefined || i === answers.length) && setIndex(i)}>{x.kind}</button>
            </li>
          )
        })}
        {done && (
          <li className={index === questions.length ? 'now' : ''}>
            <button onClick={() => setIndex(questions.length)}>Resultado</button>
          </li>
        )}
      </ol>

      {index >= questions.length ? (
        <DailySummary
          score={score}
          total={questions.length}
          questions={questions}
          answers={answers}
          onShare={share}
          copied={copied}
          next={untilMidnight()}
        />
      ) : (
        <div className="card quiz">
          <p className="question">{q.title}</p>
          <div className="prompt">{q.prompt()}</div>
          <div className={`options ${q.options.length === 2 ? 'two' : ''}`}>
            {q.options.map((o) => {
              let cls = 'option'
              if (given !== undefined) cls += o.value === q.answer ? ' correct' : o.value === given ? ' wrong' : ' dim'
              return (
                <button key={o.value} className={cls} onClick={() => answer(o.value)} disabled={given !== undefined}>
                  {o.label}
                </button>
              )
            })}
          </div>
          {given !== undefined && q.kind === 'Superficie' && (
            <p className="muted">
              {q.options
                .map((o) => COUNTRIES.find((c) => c.code === o.value)!)
                .map((c) => `${c.name}: ${formatNumber(c.area)} km²`)
                .join(' · ')}
            </p>
          )}
          {given !== undefined && (
            <button className="btn primary next" autoFocus onClick={() => setIndex(index + 1)}>
              {index === questions.length - 1 ? 'Ver resultado' : 'Siguiente →'}
            </button>
          )}
        </div>
      )}
    </GameLayout>
  )
}

function DailySummary(props: {
  score: number
  total: number
  questions: DailyQuestion[]
  answers: string[]
  onShare: () => void
  copied: boolean
  next: string
}) {
  const { score, total, onShare, copied, next } = props
  return (
    <div className="card result">
      <h2>{score === total ? 'Pleno' : score >= total - 2 ? 'Buen día' : 'Mañana más'}</h2>
      <p className="big">
        {score} / {total}
      </p>
      <div className="daily-squares">
        {props.answers.map((a, i) => (
          <span key={i} className={a === props.questions[i].answer ? 'ok' : 'ko'} />
        ))}
      </div>
      <button className="btn primary" onClick={onShare}>
        {copied ? 'Copiado' : 'Compartir resultado'}
      </button>
      <p className="muted">Siguiente reto en {next}</p>
    </div>
  )
}

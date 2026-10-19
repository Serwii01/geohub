import { useMemo, useState, type ReactNode } from 'react'
import { GameLayout, Loading, RegionPicker, Stat, type RegionOption } from '../components/GameLayout'
import { makeQuestion } from '../components/Quiz'
import { Silhouette } from '../components/Silhouette'
import { WorldMap } from '../components/WorldMap'
import { BY_CODE, flagUrl, inRegion, REGIONS, type Country } from '../data/countries'
import { regionFit, useGeo, type GeoData } from '../data/geo'
import { formatNumber, getBest, pick, sample, saveBest, shuffle, type Rng } from '../lib/utils'
import { makeTraitQuestion } from './TraitGame'

type Kind =
  | 'bandera'
  | 'bandera-inv'
  | 'silueta'
  | 'capital'
  | 'capital-inv'
  | 'moneda'
  | 'idioma'
  | 'superficie'
  | 'mapa'
  | 'localiza'
  | 'vecino'
  | 'continente'

const KIND_LABEL: Record<Kind, string> = {
  bandera: 'Banderas',
  'bandera-inv': 'Banderas',
  silueta: 'Siluetas',
  capital: 'Capitales',
  'capital-inv': 'Capitales',
  moneda: 'Monedas',
  idioma: 'Idiomas',
  superficie: 'Superficie',
  mapa: 'Mapa',
  localiza: 'Mapa',
  vecino: 'Fronteras',
  continente: 'Continentes',
}

interface Option {
  value: string
  text?: string
  flag?: Country
}

interface ExamQuestion {
  kind: Kind
  text: string
  subject: Country
  /** Vacío en las preguntas de pulsar en el mapa */
  options: Option[]
  answer: string
  /** Texto de la respuesta correcta para el repaso */
  solution: string
}

const SIZES = [10, 20, 30] as const

// ---------- Generación de preguntas ----------

function fresh(list: Country[], used: Set<string>, rng: Rng) {
  const avail = list.filter((c) => !used.has(c.code))
  const c = pick(avail.length ? avail : list, rng)
  used.add(c.code)
  return c
}

const named = (list: Country[]): Option[] => list.map((c) => ({ value: c.code, text: c.name }))

function build(kind: Kind, pool: Country[], geo: GeoData, used: Set<string>, rng: Rng): ExamQuestion {
  const withShape = pool.filter((c) => geo.byCode.has(c.code))
  switch (kind) {
    case 'bandera': {
      const q = makeQuestion(pool, used, rng)
      used.add(q.target.code)
      return { kind, text: '¿De qué país es esta bandera?', subject: q.target, options: named(q.options), answer: q.target.code, solution: q.target.name }
    }
    case 'bandera-inv': {
      const q = makeQuestion(pool, used, rng)
      used.add(q.target.code)
      return {
        kind,
        text: `¿Cuál es la bandera de ${q.target.name}?`,
        subject: q.target,
        options: q.options.map((c) => ({ value: c.code, flag: c })),
        answer: q.target.code,
        solution: q.target.name,
      }
    }
    case 'silueta': {
      const q = makeQuestion(withShape.filter((c) => c.area >= 20000), used, rng)
      used.add(q.target.code)
      return { kind, text: '¿Qué país tiene esta forma?', subject: q.target, options: named(q.options), answer: q.target.code, solution: q.target.name }
    }
    case 'capital': {
      const q = makeQuestion(pool.filter((c) => c.capital), used, rng)
      used.add(q.target.code)
      return {
        kind,
        text: `¿Cuál es la capital de ${q.target.name}?`,
        subject: q.target,
        options: q.options.map((c) => ({ value: c.code, text: c.capital })),
        answer: q.target.code,
        solution: q.target.capital,
      }
    }
    case 'capital-inv': {
      const q = makeQuestion(pool.filter((c) => c.capital), used, rng)
      used.add(q.target.code)
      return { kind, text: `¿De qué país es capital ${q.target.capital}?`, subject: q.target, options: named(q.options), answer: q.target.code, solution: q.target.name }
    }
    case 'moneda':
    case 'idioma': {
      const values = kind === 'moneda' ? (c: Country) => c.currencies : (c: Country) => c.languages
      const q = makeTraitQuestion(pool, values, used, rng)
      used.add(q.target.code)
      return {
        kind,
        text: kind === 'moneda' ? `¿Qué moneda se usa en ${q.target.name}?` : `¿Qué idioma es oficial en ${q.target.name}?`,
        subject: q.target,
        options: q.options.map((v) => ({ value: v, text: v })),
        answer: q.answer,
        solution: q.answer,
      }
    }
    case 'superficie': {
      const big = pool.filter((c) => c.area >= 1000)
      const a = fresh(big, used, rng)
      const others = big.filter((c) => c.code !== a.code && Math.abs(c.area - a.area) / Math.max(c.area, a.area) > 0.15)
      const b = fresh(others.length ? others : big.filter((c) => c.code !== a.code), used, rng)
      const winner = a.area > b.area ? a : b
      return {
        kind,
        text: '¿Cuál de los dos tiene más superficie?',
        subject: winner,
        options: [a, b].map((c) => ({ value: c.code, text: c.name, flag: c })),
        answer: winner.code,
        solution: `${a.name}: ${formatNumber(a.area)} km² · ${b.name}: ${formatNumber(b.area)} km²`,
      }
    }
    case 'mapa': {
      const q = makeQuestion(withShape.filter((c) => c.area >= 300), used, rng)
      used.add(q.target.code)
      return { kind, text: '¿Qué país está marcado en el mapa?', subject: q.target, options: named(q.options), answer: q.target.code, solution: q.target.name }
    }
    case 'localiza': {
      const c = fresh(withShape.filter((x) => x.area >= 20000), used, rng)
      return { kind, text: `Pulsa en el mapa: ${c.name}`, subject: c, options: [], answer: c.code, solution: c.name }
    }
    case 'vecino': {
      const candidates = pool.filter((c) => c.borders.some((b) => BY_CODE.has(b)))
      const c = fresh(candidates, used, rng)
      const neighbors = c.borders.filter((b) => BY_CODE.has(b))
      const answer = pick(neighbors, rng)
      const wrong = sample(
        pool.filter((x) => x.code !== c.code && !neighbors.includes(x.code) && x.region === c.region),
        3,
        rng,
      )
      return {
        kind,
        text: `¿Cuál de estos países hace frontera con ${c.name}?`,
        subject: c,
        options: shuffle(named([BY_CODE.get(answer)!, ...wrong]), rng),
        answer,
        solution: BY_CODE.get(answer)!.name,
      }
    }
    case 'continente': {
      const c = fresh(pool, used, rng)
      const others = sample(
        REGIONS.filter((r) => r !== c.region),
        3,
        rng,
      )
      return {
        kind,
        text: `¿En qué continente está ${c.name}?`,
        subject: c,
        options: shuffle([c.region, ...others], rng).map((r) => ({ value: r, text: r })),
        answer: c.region,
        solution: c.region,
      }
    }
  }
}

function buildExam(n: number, region: RegionOption, geo: GeoData): ExamQuestion[] {
  const rng = Math.random
  const pool = inRegion(region)
  // Con un continente concreto, preguntar por el continente no tiene sentido
  const kinds = (Object.keys(KIND_LABEL) as Kind[]).filter((k) => !(region !== 'Mundo' && k === 'continente'))
  const order: Kind[] = []
  while (order.length < n) order.push(...shuffle(kinds, rng))
  const used = new Set<string>()
  return order.slice(0, n).map((k) => build(k, pool, geo, used, rng))
}

// ---------- Nota ----------

export function gradeLabel(grade: number) {
  if (grade === 10) return 'Matrícula de honor'
  if (grade >= 9) return 'Sobresaliente'
  if (grade >= 7) return 'Notable'
  if (grade >= 6) return 'Bien'
  if (grade >= 5) return 'Suficiente'
  return 'Insuficiente'
}

const fmtGrade = (g: number) => g.toLocaleString('es-ES', { maximumFractionDigits: 1, minimumFractionDigits: g % 1 ? 1 : 0 })

// ---------- Componente ----------

export default function ExamGame() {
  const geo = useGeo()
  const [size, setSize] = useState<(typeof SIZES)[number]>(20)
  const [region, setRegion] = useState<RegionOption>('Mundo')
  const [questions, setQuestions] = useState<ExamQuestion[] | null>(null)
  const [answers, setAnswers] = useState<string[]>([])
  const [index, setIndex] = useState(0)
  const [finished, setFinished] = useState(false)
  const [record, setRecord] = useState(false)
  const bestKey = `examen:${size}:${region}`

  function start() {
    if (!geo) return
    setQuestions(buildExam(size, region, geo))
    setAnswers([])
    setIndex(0)
    setFinished(false)
    setRecord(false)
  }

  const correct = questions ? answers.filter((a, i) => a === questions[i].answer).length : 0
  const grade = questions ? Math.round((correct / questions.length) * 100) / 10 : 0

  function finish() {
    setFinished(true)
    // Se guarda la nota ×10 para no perder el decimal
    setRecord(saveBest(bestKey, Math.round(grade * 10)))
  }

  if (!geo) return <GameLayout title="Examen"><Loading /></GameLayout>

  // ---- Configuración ----
  if (!questions) {
    const best = getBest(bestKey)
    return (
      <GameLayout title="Examen" subtitle="Preguntas de todos los juegos mezcladas. Al final, tu nota sobre 10.">
        <div className="card exam-setup">
          <div>
            <h2>Número de preguntas</h2>
            <div className="chips">
              {SIZES.map((n) => (
                <button key={n} className={`chip ${size === n ? 'on' : ''}`} onClick={() => setSize(n)}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h2>Zona</h2>
            <RegionPicker value={region} onChange={setRegion} />
          </div>
          <div>
            <h2>Qué entra</h2>
            <p className="muted">
              Banderas, siluetas, capitales, monedas, idiomas, superficie, fronteras, continentes y preguntas de mapa
              (señalar un país o reconocer el marcado).
            </p>
          </div>
          <div className="exam-start">
            <button className="btn primary" onClick={start}>
              Empezar examen
            </button>
            {best > 0 && <span className="muted">Tu mejor nota aquí: {fmtGrade(best / 10)}</span>}
          </div>
        </div>
      </GameLayout>
    )
  }

  // ---- Resultado ----
  if (finished) {
    const byKind = new Map<string, { ok: number; total: number }>()
    questions.forEach((q, i) => {
      const k = KIND_LABEL[q.kind]
      const e = byKind.get(k) ?? { ok: 0, total: 0 }
      e.total++
      if (answers[i] === q.answer) e.ok++
      byKind.set(k, e)
    })
    return (
      <GameLayout title="Examen" subtitle={`${questions.length} preguntas · ${region}`}>
        <div className="exam-result">
          <div className="card result">
            <p className="muted">Tu nota</p>
            <p className={`grade ${grade >= 5 ? 'pass' : 'fail'}`}>{fmtGrade(grade)}</p>
            <h2>{gradeLabel(grade)}</h2>
            <p className="muted">
              {correct} de {questions.length} correctas
            </p>
            {record && <p className="record">Tu mejor nota</p>}
            <div className="result-actions">
              <button className="btn primary" onClick={start}>
                Otro examen
              </button>
              <button className="btn" onClick={() => setQuestions(null)}>
                Cambiar opciones
              </button>
            </div>
          </div>
          <div className="card">
            <h2 className="section-title">Por temas</h2>
            <ul className="topic-list">
              {[...byKind].map(([k, v]) => (
                <li key={k}>
                  <span>{k}</span>
                  <span className="topic-bar">
                    <span style={{ width: `${(v.ok / v.total) * 100}%` }} />
                  </span>
                  <span className="topic-score">
                    {v.ok}/{v.total}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="card review">
          <h2 className="section-title">Repaso</h2>
          <ol>
            {questions.map((q, i) => {
              const ok = answers[i] === q.answer
              return (
                <li key={i} className={ok ? 'ok' : 'ko'}>
                  <span className="review-q">{q.text}</span>
                  <span className="review-a">
                    {ok ? 'Bien' : `Respuesta: ${q.solution}`}
                    {!ok && answers[i] && <em> · Dijiste: {describe(q, answers[i])}</em>}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>
      </GameLayout>
    )
  }

  // ---- Pregunta ----
  const q = questions[index]
  const given = answers[index]

  function answer(v: string) {
    if (given !== undefined) return
    const next = [...answers]
    next[index] = v
    setAnswers(next)
  }

  return (
    <GameLayout
      title="Examen"
      stats={
        <>
          <Stat label="Pregunta" value={`${index + 1}/${questions.length}`} />
          <Stat label="Correctas" value={correct} />
        </>
      }
    >
      <div className="progress exam-progress">
        <div style={{ width: `${(answers.filter(Boolean).length / questions.length) * 100}%` }} />
      </div>
      <div className={`card quiz ${q.kind === 'localiza' || q.kind === 'mapa' ? 'wide' : ''}`}>
        <p className="exam-kind">{KIND_LABEL[q.kind]}</p>
        <p className="exam-question">{q.text}</p>
        <Prompt q={q} geo={geo} region={region} given={given} onClick={answer} />
        {q.options.length > 0 && (
          <div className={`options ${q.options.every((o) => o.flag && !o.text) ? 'flag-options' : ''}`}>
            {q.options.map((o) => {
              let cls = 'option'
              if (given !== undefined) cls += o.value === q.answer ? ' correct' : o.value === given ? ' wrong' : ' dim'
              return (
                <button key={o.value} className={cls} onClick={() => answer(o.value)}>
                  {o.flag && !o.text && <img src={flagUrl(o.flag, 320)} alt="" />}
                  {o.flag && o.text && (
                    <span className="daily-versus">
                      <img src={flagUrl(o.flag, 160)} alt="" />
                      {o.text}
                    </span>
                  )}
                  {!o.flag && o.text}
                </button>
              )
            })}
          </div>
        )}
        {given !== undefined && (
          <p className={given === q.answer ? 'feedback ok' : 'feedback ko'}>
            {given === q.answer ? 'Correcto' : `Incorrecto. ${q.kind === 'superficie' ? q.solution : `Era: ${q.solution}`}`}
          </p>
        )}
        <div className="quiz-actions">
          {given !== undefined && (
            <button className="btn primary" autoFocus onClick={() => (index + 1 >= questions.length ? finish() : setIndex(index + 1))}>
              {index + 1 >= questions.length ? 'Ver nota' : 'Siguiente →'}
            </button>
          )}
        </div>
      </div>
    </GameLayout>
  )
}

function describe(q: ExamQuestion, value: string) {
  const o = q.options.find((x) => x.value === value)
  if (o?.text) return o.text
  return BY_CODE.get(value)?.name ?? value
}

function Prompt({
  q,
  geo,
  region,
  given,
  onClick,
}: {
  q: ExamQuestion
  geo: GeoData
  region: RegionOption
  given?: string
  onClick: (code: string) => void
}): ReactNode {
  const fit = useMemo(() => regionFit(geo, region), [geo, region])
  switch (q.kind) {
    case 'bandera':
      return <img className="flag-big" src={flagUrl(q.subject, 640)} alt="Bandera" />
    case 'silueta':
      return <Silhouette feature={geo.byCode.get(q.subject.code)!} className="silhouette daily-shape" />
    case 'capital':
    case 'moneda':
    case 'idioma':
    case 'vecino':
    case 'continente':
      return <img className="flag-big small" src={flagUrl(q.subject, 320)} alt="" />
    case 'mapa':
      return (
        <WorldMap
          features={geo.all}
          fit={fit}
          ring={q.subject.code}
          fill={(c) => (c === q.subject.code ? (given === undefined ? 'var(--primary)' : given === q.answer ? 'var(--good)' : 'var(--bad)') : undefined)}
          height={460}
          zoomable
        />
      )
    case 'localiza':
      return (
        <WorldMap
          features={geo.all}
          fit={fit}
          ring={given !== undefined ? q.subject.code : undefined}
          fill={(c) =>
            given === undefined ? undefined : c === q.subject.code ? 'var(--good)' : c === given ? 'var(--bad)' : undefined
          }
          onSelect={(c) => given === undefined && BY_CODE.has(c) && onClick(c)}
          height={460}
          zoomable
        />
      )
    default:
      return null
  }
}

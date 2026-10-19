import { useMemo, useState } from 'react'
import { CountryInput } from '../components/CountryInput'
import { GameLayout, Loading, Stat } from '../components/GameLayout'
import { WorldMap } from '../components/WorldMap'
import { BY_CODE, COUNTRIES, flagUrl } from '../data/countries'
import { mainShape, useGeo, type GeoData } from '../data/geo'
import { getBest, pick, saveBest } from '../lib/utils'

type Graph = Map<string, string[]>

function buildGraph(geo: GeoData): Graph {
  const nodes = new Set(COUNTRIES.filter((c) => geo.byCode.has(c.code)).map((c) => c.code))
  const g: Graph = new Map()
  for (const code of nodes) g.set(code, BY_CODE.get(code)!.borders.filter((b) => nodes.has(b)))
  return g
}

/** BFS: distancias y padres desde `from`, opcionalmente restringido a `allowed` */
function bfs(g: Graph, from: string, allowed?: Set<string>) {
  const dist = new Map<string, number>([[from, 0]])
  const parent = new Map<string, string>()
  const queue = [from]
  while (queue.length) {
    const cur = queue.shift()!
    for (const n of g.get(cur) ?? []) {
      if (dist.has(n) || (allowed && !allowed.has(n))) continue
      dist.set(n, dist.get(cur)! + 1)
      parent.set(n, cur)
      queue.push(n)
    }
  }
  return { dist, parent }
}

interface Puzzle {
  start: string
  end: string
  /** Nº de saltos de la ruta más corta */
  hops: number
  fromStart: Map<string, number>
  fromEnd: Map<string, number>
  optimal: string[] // países intermedios de una ruta óptima
}

function makePuzzle(g: Graph): Puzzle {
  const candidates = [...g.keys()].filter((k) => g.get(k)!.length > 0)
  for (;;) {
    const start = pick(candidates)
    const { dist, parent } = bfs(g, start)
    const ends = [...dist].filter(([, d]) => d >= 3 && d <= 6).map(([k]) => k)
    if (!ends.length) continue
    const end = pick(ends)
    const optimal: string[] = []
    for (let cur = parent.get(end); cur && cur !== start; cur = parent.get(cur)) optimal.unshift(cur)
    return { start, end, hops: dist.get(end)!, fromStart: dist, fromEnd: bfs(g, end).dist, optimal }
  }
}

const COLORS = { good: 'var(--good)', near: 'var(--warn)', far: 'var(--bad)' }

export default function RouteGame() {
  const geo = useGeo()
  const graph = useMemo(() => (geo ? buildGraph(geo) : null), [geo])
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null)
  const [guesses, setGuesses] = useState<string[]>([])
  const [hints, setHints] = useState<string[]>([])
  const [wins, setWins] = useState(0)

  if (graph && !puzzle) setPuzzle(makePuzzle(graph))
  if (!geo || !graph || !puzzle) return <GameLayout title="Rutas" icon="route"><Loading /></GameLayout>

  const { start, end, hops, fromStart, fromEnd, optimal } = puzzle
  const maxGuesses = hops - 1 + 4
  const allowed = new Set([start, end, ...guesses])
  const won = bfs(graph, start, allowed).dist.has(end)
  const lost = !won && guesses.length >= maxGuesses
  const over = won || lost

  function quality(code: string): keyof typeof COLORS {
    const a = fromStart.get(code)
    const b = fromEnd.get(code)
    if (a === undefined || b === undefined) return 'far'
    if (a + b === hops) return 'good'
    if (a + b <= hops + 2) return 'near'
    return 'far'
  }

  function guess(code: string) {
    if (over || allowed.has(code)) return
    const next = [...guesses, code]
    setGuesses(next)
    if (bfs(graph!, start, new Set([start, end, ...next])).dist.has(end)) {
      setWins((w) => w + 1)
      saveBest('rutas', wins + 1)
    }
  }

  function hint() {
    const missing = optimal.filter((c) => !guesses.includes(c) && !hints.includes(c))
    if (missing.length) setHints([...hints, missing[0]])
  }

  function newGame() {
    setPuzzle(makePuzzle(graph!))
    setGuesses([])
    setHints([])
  }

  const focus = [start, end, ...guesses, ...(lost ? optimal : [])]
    .map((c) => geo.byCode.get(c))
    .filter((f) => !!f)
    .map((f) => mainShape(f!))

  const fill = (code: string) => {
    if (code === start) return 'var(--start)'
    if (code === end) return 'var(--end)'
    if (guesses.includes(code)) return COLORS[quality(code)]
    if (lost && optimal.includes(code)) return 'var(--reveal)'
    return undefined
  }

  const S = BY_CODE.get(start)!
  const E = BY_CODE.get(end)!

  return (
    <GameLayout
      title="Rutas"
      icon="route"
      subtitle="Conecta dos países por tierra nombrando los que hay en medio."
      stats={
        <>
          <Stat label="Intentos" value={`${guesses.length}/${maxGuesses}`} />
          <Stat label="Mínimo" value={hops - 1} />
          <Stat label="Victorias" value={wins} />
          <Stat label="Récord" value={getBest('rutas')} />
        </>
      }
    >
      <div className="route-header card">
        <span className="endpoint start">
          <img src={flagUrl(S, 160)} alt="" /> {S.name}
        </span>
        <span className="route-arrow" />
        <span className="endpoint end">
          <img src={flagUrl(E, 160)} alt="" /> {E.name}
        </span>
      </div>

      <div className="split wide-map">
        <div className="card map-card">
          <WorldMap features={geo.all} fit={focus} fill={fill} height={560} padding={40} />
          <div className="legend">
            <span><i style={{ background: 'var(--good)' }} /> En una ruta óptima</span>
            <span><i style={{ background: 'var(--warn)' }} /> Cerca</span>
            <span><i style={{ background: 'var(--bad)' }} /> Lejos</span>
          </div>
        </div>
        <div className="card">
          {over ? (
            <div className="reveal">
              <strong>{won ? 'Ruta completada' : 'Sin intentos'}</strong>
              <span>
                Ruta óptima: {[start, ...optimal, end].map((c) => BY_CODE.get(c)!.name).join(' → ')}
              </span>
              <button className="btn primary" onClick={newGame}>
                Nueva ruta →
              </button>
            </div>
          ) : (
            <>
              <CountryInput onSubmit={(c) => guess(c.code)} exclude={allowed} />
              <button className="btn ghost" onClick={hint} disabled={hints.length >= optimal.length}>
                Pista ({hints.length})
              </button>
              {hints.length > 0 && (
                <p className="hint">
                  Prueba con: {hints.map((h) => BY_CODE.get(h)!.name).join(', ')}
                </p>
              )}
            </>
          )}
          <ul className="chip-list">
            {guesses.map((c) => (
              <li key={c} style={{ borderColor: COLORS[quality(c)] }}>
                <i style={{ background: COLORS[quality(c)] }} />
                {BY_CODE.get(c)!.name}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </GameLayout>
  )
}

import { useMemo, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SiteHeader } from './components/GameLayout'
import { Silhouette } from './components/Silhouette'
import { WorldMap } from './components/WorldMap'
import { BY_CODE, COUNTRIES, flagUrl } from './data/countries'
import { mainShape, regionFit, useGeo, type GeoData } from './data/geo'
import { DAILY_GAMES, dailyKey, load, store, todayKey, type DailyRecord } from './lib/daily'
import { getBest, pick, sample } from './lib/utils'

interface GameInfo {
  path: string
  title: string
  desc: string
  best: string
  unit: string
  /** El examen guarda la nota ×10 */
  scale?: number
  preview: (geo: GeoData | null) => ReactNode
}

const ROUTE = ['ESP', 'FRA', 'DEU', 'POL']
const RECOGNIZABLE = ['ITA', 'JPN', 'CHL', 'GBR', 'MEX', 'NOR', 'GRC', 'NZL', 'VNM', 'IRL', 'CUB', 'MDG']

function MapPreview({ geo, ...props }: { geo: GeoData | null } & Omit<Parameters<typeof WorldMap>[0], 'features'>) {
  if (!geo) return null
  return <WorldMap features={geo.all} width={480} height={270} padding={14} {...props} />
}

function fitOf(geo: GeoData | null, codes: string[]) {
  return geo ? codes.filter((c) => geo.byCode.has(c)).map((c) => mainShape(geo.byCode.get(c)!)) : undefined
}

function useGames(): GameInfo[] {
  // Elementos aleatorios fijados al montar para que no cambien en cada render
  const flags = useMemo(() => sample(COUNTRIES, 6), [])
  const wall = useMemo(() => sample(COUNTRIES, 24), [])
  const shape = useMemo(() => pick(RECOGNIZABLE), [])
  const capital = useMemo(() => pick(COUNTRIES.filter((c) => c.capital.length < 12)), [])
  const pair = useMemo(() => sample(COUNTRIES.filter((c) => c.area > 50000), 2), [])
  const europeFound = useMemo(() => new Set(sample(COUNTRIES.filter((c) => c.region === 'Europa'), 26).map((c) => c.code)), [])

  return [
    {
      path: 'examen',
      title: 'Examen',
      desc: 'Preguntas de todos los juegos mezcladas y una nota del 0 al 10.',
      best: 'examen:20:Mundo',
      unit: '',
      scale: 10,
      preview: () => (
        <div className="preview-grade">
          <span className="preview-grade-num">8,5</span>
          <span>Notable</span>
        </div>
      ),
    },
    {
      path: 'rutas',
      title: 'Rutas',
      desc: 'Ve de un país a otro por tierra nombrando los que hay en medio.',
      best: 'rutas',
      unit: ' rutas',
      preview: (geo) => (
        <MapPreview
          geo={geo}
          fit={fitOf(geo, ROUTE)}
          fill={(c) => (c === 'ESP' ? 'var(--start)' : c === 'POL' ? 'var(--end)' : ROUTE.includes(c) ? 'var(--good)' : undefined)}
        />
      ),
    },
    {
      path: 'siluetas',
      title: 'Siluetas',
      desc: 'Adivina el país por su forma. Cada intento te dice a qué distancia y en qué dirección está.',
      best: 'siluetas',
      unit: ' seguidas',
      preview: (geo) => <div className="preview-silhouette">{geo && <Silhouette feature={geo.byCode.get(shape)!} className="preview-shape" />}</div>,
    },
    {
      path: 'banderas',
      title: 'Banderas',
      desc: 'De bandera a país o de país a bandera.',
      best: 'banderas:Mundo',
      unit: '/10',
      preview: () => (
        <div className="preview-flags">
          {flags.map((c) => (
            <img key={c.code} src={flagUrl(c, 160)} alt="" loading="lazy" />
          ))}
        </div>
      ),
    },
    {
      path: 'todas-banderas',
      title: 'Todas las banderas',
      desc: `Las ${COUNTRIES.length} banderas del mundo en 15 minutos.`,
      best: 'todas-banderas',
      unit: ' banderas',
      preview: () => (
        <div className="preview-wall">
          {wall.map((c) => (
            <img key={c.code} src={flagUrl(c, 160)} alt="" loading="lazy" />
          ))}
        </div>
      ),
    },
    {
      path: 'localiza',
      title: 'Localiza',
      desc: 'Te decimos un país y lo buscas en el mapa. Puntos por cercanía.',
      best: 'localiza:Mundo',
      unit: ' pts',
      preview: (geo) => <MapPreview geo={geo} fill={(c) => (c === 'PER' ? 'var(--good)' : c === 'BOL' ? 'var(--bad)' : undefined)} />,
    },
    {
      path: 'que-pais',
      title: '¿Qué país es?',
      desc: 'Un país marcado en el mapa. Escribe cuál es.',
      best: 'mapamudo:Mundo',
      unit: ' pts',
      preview: (geo) => (
        <MapPreview geo={geo} fit={geo ? regionFit(geo, 'África') : undefined} fill={(c) => (c === 'TZA' ? 'var(--primary)' : undefined)} />
      ),
    },
    {
      path: 'vecinos',
      title: 'Vecinos',
      desc: 'Nombra todos los países que hacen frontera con el que te toca.',
      best: 'vecinos',
      unit: ' seguidas',
      preview: (geo) => {
        const neighbors = BY_CODE.get('DEU')!.borders
        return (
          <MapPreview
            geo={geo}
            fit={fitOf(geo, ['DEU', ...neighbors])}
            fill={(c) => (c === 'DEU' ? 'var(--primary)' : ['FRA', 'POL', 'AUT', 'CHE'].includes(c) ? 'var(--good)' : undefined)}
          />
        )
      },
    },
    {
      path: 'monedas-idiomas',
      title: 'Monedas e idiomas',
      desc: 'Qué moneda se usa y qué idioma se habla en cada país.',
      best: 'rasgos-moneda:Mundo',
      unit: '/10',
      preview: () => (
        <div className="preview-words">
          <span>Yen</span>
          <span>Florín húngaro</span>
          <span>Suajili</span>
          <span>Rupia</span>
          <span>Neerlandés</span>
        </div>
      ),
    },
    {
      path: 'capitales',
      title: 'Capitales',
      desc: 'De país a capital o de capital a país.',
      best: 'capitales-capital:Mundo',
      unit: '/10',
      preview: () => (
        <div className="preview-capital">
          <img src={flagUrl(capital, 160)} alt="" loading="lazy" />
          <span>{capital.capital}</span>
        </div>
      ),
    },
    {
      path: 'superficie',
      title: '¿Más grande?',
      desc: 'Dos países: ¿cuál ocupa más? Aguanta la racha.',
      best: 'superficie',
      unit: ' seguidas',
      preview: () => (
        <div className="preview-versus">
          <img src={flagUrl(pair[0], 160)} alt="" loading="lazy" />
          <span>o</span>
          <img src={flagUrl(pair[1], 160)} alt="" loading="lazy" />
        </div>
      ),
    },
    {
      path: 'contrarreloj',
      title: 'Contrarreloj',
      desc: 'Todos los países de un continente antes de que acabe el tiempo.',
      best: 'nombra:Europa',
      unit: ' países',
      preview: (geo) => (
        <MapPreview
          geo={geo}
          fit={geo ? regionFit(geo, 'Europa') : undefined}
          fill={(c) => (europeFound.has(c) ? 'var(--good)' : undefined)}
        />
      ),
    },
  ]
}

/** Reto diario y diarios de cada juego, con lo que ya has hecho hoy */
function DailyBanner() {
  const navigate = useNavigate()
  const answered = load<string[]>(`geohub:daily:${todayKey()}`, []).length
  const long = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  const date = long.charAt(0).toUpperCase() + long.slice(1)

  function openDaily(id: string, path: string) {
    // Abre el juego directamente en su modo diario
    store(`geohub:modo:${id.split('-')[0]}`, 'diario')
    navigate(path)
  }

  return (
    <section className="daily-banner">
      <div className="daily-main">
        <span className="daily-date">{date}</span>
        <h2>Diarios</h2>
        <p>Los mismos retos para todo el mundo, una vez al día. Compara tu resultado.</p>
        <Link to="/reto-diario" className="btn primary">
          {answered >= 6 ? 'Reto diario: ver resultado' : answered > 0 ? 'Continuar el reto diario' : 'Jugar el reto diario'}
        </Link>
      </div>
      <ul className="daily-list">
        {DAILY_GAMES.map((g) => {
          const rec = load<DailyRecord | null>(dailyKey(g.id), null)
          return (
            <li key={g.id}>
              <button onClick={() => openDaily(g.id, g.path)} className={rec?.done ? 'done' : rec ? 'started' : ''}>
                <span>{g.title}</span>
                <span className="daily-state">{rec?.done ? rec.squares || 'Hecho' : rec ? 'A medias' : 'Pendiente'}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default function Home() {
  const geo = useGeo()
  const games = useGames()

  return (
    <>
      <SiteHeader />
      <main className="home">
        <div className="home-head">
          <h1>Juegos de geografía</h1>
          <p>
            {games.length} juegos con {COUNTRIES.length} países. Partidas de un par de minutos, sin registrarse.
          </p>
        </div>

        <DailyBanner />

        <section className="cards">
          {games.map((g) => {
            const best = getBest(g.best)
            return (
              <Link key={g.path} to={`/${g.path}`} className="game-card">
                <div className="preview">{g.preview(geo)}</div>
                <div className="card-body">
                  <h2>{g.title}</h2>
                  <p>{g.desc}</p>
                  {best > 0 && (
                    <span className="card-best">
                      Tu récord: {(best / (g.scale ?? 1)).toLocaleString('es-ES')}
                      {g.unit}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </section>

        <footer className="footer">
          Datos de <a href="https://github.com/mledoze/countries">mledoze/countries</a> · Mapas de{' '}
          <a href="https://www.naturalearthdata.com/">Natural Earth</a> · Banderas de{' '}
          <a href="https://flagcdn.com">flagcdn</a>
        </footer>
      </main>
    </>
  )
}

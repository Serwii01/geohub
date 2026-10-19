import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { SiteHeader } from './components/GameLayout'
import { Silhouette } from './components/Silhouette'
import { WorldMap } from './components/WorldMap'
import { BY_CODE, COUNTRIES, flagUrl } from './data/countries'
import { mainShape, regionFit, useGeo, type GeoData } from './data/geo'
import { getBest, pick, sample } from './lib/utils'

interface GameInfo {
  path: string
  title: string
  desc: string
  best: string
  unit: string
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
                      Tu récord: {best.toLocaleString('es-ES')}
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

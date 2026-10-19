import { Link } from 'react-router-dom'
import { Icon, type IconName } from './components/Icons'
import { WorldMap } from './components/WorldMap'
import { COUNTRIES } from './data/countries'
import { useGeo } from './data/geo'
import { getBest } from './lib/utils'

interface GameInfo {
  path: string
  icon: IconName
  title: string
  desc: string
  tag: string
  best: string
  unit: string
}

const GAMES: GameInfo[] = [
  { path: 'banderas', icon: 'flag', title: 'Banderas', desc: 'Reconoce el país por su bandera.', tag: 'Test', best: 'banderas:Mundo', unit: '/10' },
  { path: 'siluetas', icon: 'shape', title: 'Siluetas', desc: 'Deduce el país por su contorno, con pistas de distancia y rumbo.', tag: 'Deducción', best: 'siluetas', unit: ' seguidas' },
  { path: 'rutas', icon: 'route', title: 'Rutas', desc: 'Cruza de un país a otro por tierra nombrando los que hay en medio.', tag: 'Estrategia', best: 'rutas', unit: ' rutas' },
  { path: 'capitales', icon: 'capital', title: 'Capitales', desc: 'De país a capital, o al revés.', tag: 'Test', best: 'capitales-capital:Mundo', unit: '/10' },
  { path: 'localiza', icon: 'pin', title: 'Localiza', desc: 'Señala el país en el mapa. Cuanto más cerca, más puntos.', tag: 'Mapa', best: 'localiza:Mundo', unit: ' pts' },
  { path: 'superficie', icon: 'area', title: '¿Más grande?', desc: 'Compara superficies y mantén la racha.', tag: 'Intuición', best: 'superficie', unit: ' seguidas' },
  { path: 'contrarreloj', icon: 'clock', title: 'Contrarreloj', desc: 'Nombra todos los países de un continente antes de que acabe el tiempo.', tag: 'Memoria', best: 'nombra:Europa', unit: ' países' },
]

export default function Home() {
  const geo = useGeo()

  return (
    <div className="home">
      <nav className="topbar">
        <Link to="/" className="wordmark">
          <Icon name="globe" size={20} /> GeoHub
        </Link>
        <span className="topbar-meta">
          {GAMES.length} juegos · {COUNTRIES.length} países
        </span>
      </nav>

      <header className="hero">
        <div className="hero-text">
          <p className="eyebrow">Juegos de geografía</p>
          <h1>
            El mundo, <em>en siete juegos.</em>
          </h1>
          <p className="lede">
            Banderas, siluetas, rutas por tierra, capitales y mapas. Partidas cortas para afinar tu mapa mental, sin
            registro.
          </p>
          <Link to="/rutas" className="btn primary">
            Empezar por Rutas <Icon name="arrow" size={16} style={{ transform: 'rotate(90deg)' }} />
          </Link>
        </div>
        <div className="hero-map">{geo && <WorldMap features={geo.all} padding={0} />}</div>
      </header>

      <section className="game-list">
        {GAMES.map((g, i) => {
          const best = getBest(g.best)
          return (
            <Link key={g.path} to={`/${g.path}`} className="game-row">
              <span className="row-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="row-icon">
                <Icon name={g.icon} size={26} />
              </span>
              <span className="row-main">
                <span className="row-title">{g.title}</span>
                <span className="row-desc">{g.desc}</span>
              </span>
              <span className="row-tag">{g.tag}</span>
              <span className="row-best">{best > 0 ? `Récord ${best.toLocaleString('es-ES')}${g.unit}` : ''}</span>
              <span className="row-go">
                <Icon name="arrow" size={18} style={{ transform: 'rotate(90deg)' }} />
              </span>
            </Link>
          )
        })}
      </section>

      <footer className="footer">
        <span>GeoHub</span>
        <span>
          Datos de <a href="https://github.com/mledoze/countries">mledoze/countries</a>, mapas de{' '}
          <a href="https://github.com/topojson/world-atlas">Natural Earth</a> y banderas de{' '}
          <a href="https://flagcdn.com">flagcdn</a>.
        </span>
      </footer>
    </div>
  )
}

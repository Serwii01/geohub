import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { REGIONS, type Region } from '../data/countries'
import { Icon, type IconName } from './Icons'

interface Props {
  title: string
  icon: IconName
  subtitle?: string
  stats?: ReactNode
  children: ReactNode
}

export function GameLayout({ title, icon, subtitle, stats, children }: Props) {
  return (
    <div className="game">
      <nav className="topbar">
        <Link to="/" className="wordmark">
          <Icon name="globe" size={20} /> GeoHub
        </Link>
        <Link to="/" className="back">
          <Icon name="arrow" size={15} style={{ transform: 'rotate(-90deg)' }} /> Todos los juegos
        </Link>
      </nav>
      <header className="game-header">
        <div className="game-title">
          <span className="game-icon">
            <Icon name={icon} size={30} />
          </span>
          <div>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>
        <div className="game-stats">{stats}</div>
      </header>
      <main className="game-body">{children}</main>
    </div>
  )
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}

export type RegionOption = Region | 'Mundo'

export function RegionPicker({ value, onChange }: { value: RegionOption; onChange: (r: RegionOption) => void }) {
  const options: RegionOption[] = ['Mundo', ...REGIONS]
  return (
    <div className="chips">
      {options.map((r) => (
        <button key={r} className={`chip ${r === value ? 'on' : ''}`} onClick={() => onChange(r)}>
          {r}
        </button>
      ))}
    </div>
  )
}

export function Loading() {
  return <div className="loading">Cargando mapa…</div>
}

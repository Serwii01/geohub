import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { REGIONS, type Region } from '../data/countries'

interface Props {
  title: string
  subtitle?: string
  stats?: ReactNode
  children: ReactNode
}

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="logo">
          <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="7" fill="var(--primary)" />
            <g fill="none" stroke="#fff" strokeWidth="1.8"><circle cx="16" cy="16" r="8.5" /><path d="M7.5 16h17M16 7.5c2.6 2.4 3.9 5.2 3.9 8.5s-1.3 6.1-3.9 8.5c-2.6-2.4-3.9-5.2-3.9-8.5s1.3-6.1 3.9-8.5z" /></g>
          </svg>
          GeoHub
        </Link>
        <nav>
          <Link to="/">Juegos</Link>
        </nav>
      </div>
    </header>
  )
}

export function GameLayout({ title, subtitle, stats, children }: Props) {
  return (
    <>
      <SiteHeader />
      <div className="game">
        <div className="game-header">
          <div className="game-title">
            <Link to="/" className="back">
              ← Volver
            </Link>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <div className="game-stats">{stats}</div>
        </div>
        <main className="game-body">{children}</main>
      </div>
    </>
  )
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  )
}

export type RegionOption = Region | 'Mundo'

export function RegionPicker({ value, onChange }: { value: RegionOption; onChange: (r: RegionOption) => void }) {
  const options: RegionOption[] = ['Mundo', ...REGIONS]
  return (
    <div className="tabs" role="tablist">
      {options.map((r) => (
        <button key={r} role="tab" aria-selected={r === value} className={r === value ? 'on' : ''} onClick={() => onChange(r)}>
          {r}
        </button>
      ))}
    </div>
  )
}

export function Loading() {
  return <div className="loading">Cargando…</div>
}

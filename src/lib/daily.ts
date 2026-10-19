import { useEffect, useState } from 'react'
import { seededRng, type Rng } from './utils'

export type PlayMode = 'libre' | 'diario'
export type Rounds = 10 | 'inf'

/** Fecha local en formato AAAA-MM-DD */
export function todayKey(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function yesterdayKey(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return todayKey(d)
}

export function untilMidnight(): string {
  const now = new Date()
  const next = new Date(now)
  next.setHours(24, 0, 0, 0)
  const s = Math.floor((next.getTime() - now.getTime()) / 1000)
  return `${Math.floor(s / 3600)} h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')} min`
}

/** El mismo generador para todo el mundo en el mismo día y juego */
export function dailyRng(gameId: string, date = todayKey()): Rng {
  return seededRng(`geohub:${gameId}:${date}`)
}

export function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}

export function store(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* almacenamiento no disponible */
  }
}

/** Preferencia guardada en el navegador */
export function usePref<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => load(key, initial))
  useEffect(() => store(key, value), [key, value])
  return [value, setValue]
}

/** Nota de una respuesta, de 0 a 1, para los cuadrados de compartir */
export function square(ratio: number): string {
  return ratio >= 0.8 ? '🟩' : ratio > 0 ? '🟨' : '🟥'
}

export function shareText(title: string, date: string, squares: string, score: string): string {
  const [y, m, d] = date.split('-')
  return `GeoHub · ${title} · ${d}/${m}/${y}\n${squares} ${score}\n${location.origin}`
}

export async function shareResult(text: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (navigator.share) {
      await navigator.share({ text })
      return 'shared'
    }
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'failed'
  }
}

/** Resultado guardado de un diario */
export interface DailyRecord<P = unknown> {
  done: boolean
  score: number
  max: number
  squares: string
  progress?: P
}

export function dailyKey(gameId: string, date = todayKey()) {
  return `geohub:dia:${gameId}:${date}`
}

/** Juegos con diario, para la portada */
export const DAILY_GAMES: { id: string; path: string; title: string }[] = [
  { id: 'siluetas', path: '/siluetas', title: 'Siluetas' },
  { id: 'rutas', path: '/rutas', title: 'Rutas' },
  { id: 'vecinos', path: '/vecinos', title: 'Vecinos' },
  { id: 'banderas', path: '/banderas', title: 'Banderas' },
  { id: 'capitales-capital', path: '/capitales', title: 'Capitales' },
  { id: 'rasgos-moneda', path: '/monedas-idiomas', title: 'Monedas e idiomas' },
  { id: 'localiza', path: '/localiza', title: 'Localiza' },
  { id: 'mapamudo', path: '/que-pais', title: '¿Qué país es?' },
]

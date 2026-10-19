import type { Country } from '../data/countries'
import { distanceKm, sample, type Rng } from './utils'

export type Difficulty = 'facil' | 'normal' | 'dificil'

export const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'facil', label: 'Fácil' },
  { value: 'normal', label: 'Normal' },
  { value: 'dificil', label: 'Difícil' },
]

/**
 * De dónde salen las opciones falsas según la dificultad:
 * fácil = otros continentes, normal = mismo continente, difícil = los países más cercanos
 * (vecinos con banderas, idiomas y monedas que se confunden).
 */
export function distractorSource(target: Country, pool: Country[], difficulty: Difficulty, n = 3): Country[] {
  const others = pool.filter((c) => c.code !== target.code)
  if (difficulty === 'facil') return others.filter((c) => c.region !== target.region)
  if (difficulty === 'dificil')
    return [...others]
      .sort((a, b) => distanceKm(a.latlng, target.latlng) - distanceKm(b.latlng, target.latlng))
      .slice(0, n * 2)
  return others.filter((c) => c.region === target.region)
}

/** `n` países distintos de `target` como opciones falsas; si faltan, se completan con cualquiera */
export function distractorCountries(target: Country, pool: Country[], difficulty: Difficulty, rng: Rng, n = 3): Country[] {
  const chosen = sample(distractorSource(target, pool, difficulty, n), n, rng)
  if (chosen.length < n) {
    const rest = pool.filter((c) => c.code !== target.code && !chosen.includes(c))
    chosen.push(...sample(rest, n - chosen.length, rng))
  }
  return chosen
}

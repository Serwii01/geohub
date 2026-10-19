export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export type Rng = () => number

/** Generador pseudoaleatorio reproducible (mulberry32) a partir de un texto */
export function seededRng(seed: string): Rng {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle<T>(arr: T[], rng: Rng = Math.random): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function pick<T>(arr: T[], rng: Rng = Math.random): T {
  return arr[Math.floor(rng() * arr.length)]
}

export function sample<T>(arr: T[], n: number, rng: Rng = Math.random): T[] {
  return shuffle(arr, rng).slice(0, n)
}

const R = 6371
const rad = (d: number) => (d * Math.PI) / 180

/** Distancia en km entre dos [lat, lng] */
export function distanceKm(a: [number, number], b: [number, number]): number {
  const dLat = rad(b[0] - a[0])
  const dLng = rad(b[1] - a[1])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Rumbo inicial en grados (0 = norte) de a hacia b */
export function bearing(a: [number, number], b: [number, number]): number {
  const y = Math.sin(rad(b[1] - a[1])) * Math.cos(rad(b[0]))
  const x =
    Math.cos(rad(a[0])) * Math.sin(rad(b[0])) - Math.sin(rad(a[0])) * Math.cos(rad(b[0])) * Math.cos(rad(b[1] - a[1]))
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('es-ES')
}

const BEST_KEY = 'geohub:best'

export function getBest(game: string): number {
  try {
    const all = JSON.parse(localStorage.getItem(BEST_KEY) ?? '{}')
    return Number(all[game] ?? 0)
  } catch {
    return 0
  }
}

/** Guarda el récord si lo supera; devuelve true si es nuevo récord */
export function saveBest(game: string, score: number): boolean {
  try {
    const all = JSON.parse(localStorage.getItem(BEST_KEY) ?? '{}')
    if (score > Number(all[game] ?? 0)) {
      all[game] = score
      localStorage.setItem(BEST_KEY, JSON.stringify(all))
      return true
    }
  } catch {
    /* almacenamiento no disponible */
  }
  return false
}

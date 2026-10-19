import { useEffect, useState } from 'react'
import { feature } from 'topojson-client'
import { geoArea, geoCentroid, geoDistance } from 'd3-geo'
import type { Feature, FeatureCollection, Geometry, MultiPolygon } from 'geojson'
import { BY_CCN3 } from './countries'

export type CountryFeature = Feature<Geometry, { code: string }>

export interface GeoData {
  /** Todos los países con forma (sin la Antártida), indexados por cca3 */
  byCode: Map<string, CountryFeature>
  all: CountryFeature[]
}

let cache: Promise<GeoData> | null = null

export function loadGeo(): Promise<GeoData> {
  cache ??= import('world-atlas/countries-50m.json').then((mod) => {
    const topo = mod.default
    const fc = feature(topo, topo.objects.countries) as unknown as FeatureCollection
    const byCode = new Map<string, CountryFeature>()
    for (const f of fc.features) {
      const c = BY_CCN3.get(String(f.id))
      if (!c) continue
      byCode.set(c.code, { ...f, properties: { code: c.code } } as CountryFeature)
    }
    // Territorios no independientes también se dibujan como fondo
    const all: CountryFeature[] = fc.features
      .filter((f) => String(f.id) !== '010')
      .map((f) => {
        const c = BY_CCN3.get(String(f.id))
        return { ...f, properties: { code: c?.code ?? `X${f.id ?? Math.random()}` } } as CountryFeature
      })
    return { byCode, all }
  })
  return cache
}

export function useGeo(): GeoData | null {
  const [geo, setGeo] = useState<GeoData | null>(null)
  useEffect(() => {
    let alive = true
    loadGeo().then((g) => alive && setGeo(g))
    return () => {
      alive = false
    }
  }, [])
  return geo
}

const mainCache = new Map<string, CountryFeature>()

/**
 * Devuelve la parte "principal" de un país: descarta territorios lejanos
 * (Guayana Francesa, Alaska, Hawái…) para que la silueta sea reconocible.
 */
export function mainShape(f: CountryFeature, maxKm = 2500): CountryFeature {
  const key = f.properties.code
  const hit = mainCache.get(key)
  if (hit) return hit
  let result = f
  if (f.geometry.type === 'MultiPolygon') {
    const polys = (f.geometry as MultiPolygon).coordinates.map((coords) => ({
      type: 'Feature' as const,
      properties: {},
      geometry: { type: 'Polygon' as const, coordinates: coords },
    }))
    const areas = polys.map((p) => geoArea(p))
    const biggest = polys[areas.indexOf(Math.max(...areas))]
    const center = geoCentroid(biggest)
    const kept = polys.filter((p) => geoDistance(geoCentroid(p), center) * 6371 < maxKm)
    result = {
      ...f,
      geometry: { type: 'MultiPolygon', coordinates: kept.map((p) => p.geometry.coordinates) },
    }
  }
  mainCache.set(key, result)
  return result
}

import { memo, useMemo } from 'react'
import { geoCentroid, geoMercator, geoNaturalEarth1, geoPath } from 'd3-geo'
import type { CountryFeature } from '../data/geo'

interface Props {
  features: CountryFeature[]
  /** Si se indica, el mapa se encuadra en estos países; si no, mapa mundial */
  fit?: CountryFeature[]
  fill?: (code: string) => string | undefined
  onSelect?: (code: string) => void
  width?: number
  height?: number
  padding?: number
  className?: string
}

function WorldMapInner({ features, fit, fill, onSelect, width = 960, height = 500, padding = 20, className }: Props) {
  const fitKey = fit?.map((f) => f.properties.code).join(',') ?? 'world'

  const paths = useMemo(() => {
    let projection
    if (fit && fit.length) {
      const collection = { type: 'FeatureCollection' as const, features: fit }
      const [lon] = geoCentroid(collection)
      projection = geoMercator()
        .rotate([-lon, 0])
        .fitExtent(
          [
            [padding, padding],
            [width - padding, height - padding],
          ],
          collection,
        )
    } else {
      projection = geoNaturalEarth1()
        .rotate([-10, 0])
        .fitExtent(
          [
            [padding, padding],
            [width - padding, height - padding],
          ],
          { type: 'Sphere' },
        )
    }
    const path = geoPath(projection)
    return features.map((f) => ({ code: f.properties.code, d: path(f) ?? '' }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [features, fitKey, width, height, padding])

  return (
    <svg
      className={`world-map ${onSelect ? 'clickable' : ''} ${className ?? ''}`}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Mapa"
    >
      <rect width={width} height={height} className="sea" rx="14" />
      {paths.map(({ code, d }) => {
        const color = fill?.(code)
        return (
          <path
            key={code}
            d={d}
            className={color ? 'country highlighted' : 'country'}
            style={color ? { fill: color } : undefined}
            onClick={onSelect && !code.startsWith('X') ? () => onSelect(code) : undefined}
          />
        )
      })}
    </svg>
  )
}

export const WorldMap = memo(WorldMapInner)

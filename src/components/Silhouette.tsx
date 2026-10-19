import { useMemo } from 'react'
import { geoAzimuthalEqualArea, geoCentroid, geoPath } from 'd3-geo'
import { mainShape, type CountryFeature } from '../data/geo'

/** Contorno de un país en proyección azimutal centrada en él (evita cortes en el antimeridiano) */
export function Silhouette({ feature, className = 'silhouette' }: { feature: CountryFeature; className?: string }) {
  const d = useMemo(() => {
    const shape = mainShape(feature)
    const [lon, lat] = geoCentroid(shape)
    const projection = geoAzimuthalEqualArea()
      .rotate([-lon, -lat])
      .fitExtent(
        [
          [20, 20],
          [380, 380],
        ],
        shape,
      )
    return geoPath(projection)(shape) ?? ''
  }, [feature])
  return (
    <svg className={className} viewBox="0 0 400 400">
      <path d={d} />
    </svg>
  )
}

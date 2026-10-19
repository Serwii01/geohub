import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { geoCentroid, geoMercator, geoNaturalEarth1, geoPath } from 'd3-geo'
import type { CountryFeature } from '../data/geo'

interface Props {
  features: CountryFeature[]
  /** Si se indica, el mapa se encuadra en estos países; si no, mapa mundial */
  fit?: CountryFeature[]
  fill?: (code: string) => string | undefined
  onSelect?: (code: string) => void
  /** Rodea con un círculo este país si es demasiado pequeño para verse */
  ring?: string
  /** Permite zoom con rueda/pellizco y arrastrar para mover */
  zoomable?: boolean
  width?: number
  height?: number
  padding?: number
  className?: string
}

interface View {
  k: number
  x: number
  y: number
}

const MAX_ZOOM = 16

function WorldMapInner({
  features,
  fit,
  fill,
  onSelect,
  ring,
  zoomable,
  width = 960,
  height = 500,
  padding = 20,
  className,
}: Props) {
  const fitKey = fit?.map((f) => f.properties.code).join(',') ?? 'world'

  const { paths, path } = useMemo(() => {
    const box: [[number, number], [number, number]] = [
      [padding, padding],
      [width - padding, height - padding],
    ]
    let projection
    if (fit && fit.length) {
      const collection = { type: 'FeatureCollection' as const, features: fit }
      const [lon] = geoCentroid(collection)
      projection = geoMercator().rotate([-lon, 0]).fitExtent(box, collection)
    } else {
      projection = geoNaturalEarth1().rotate([-10, 0]).fitExtent(box, { type: 'Sphere' })
    }
    const path = geoPath(projection)
    return { path, paths: features.map((f) => ({ code: f.properties.code, d: path(f) ?? '' })) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [features, fitKey, width, height, padding])

  const ringShape = useMemo(() => {
    const f = ring ? features.find((x) => x.properties.code === ring) : undefined
    if (!f) return null
    const [[x0, y0], [x1, y1]] = path.bounds(f)
    if (Math.max(x1 - x0, y1 - y0) > 18) return null
    const [cx, cy] = path.centroid(f)
    return { cx, cy }
  }, [ring, features, path])

  // ---------- Zoom y desplazamiento ----------
  const svgRef = useRef<SVGSVGElement>(null)
  const [view, setView] = useState<View>({ k: 1, x: 0, y: 0 })
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef({ moved: false, pinch: 0 })

  useEffect(() => setView({ k: 1, x: 0, y: 0 }), [fitKey])

  function clampView(v: View): View {
    const k = Math.min(MAX_ZOOM, Math.max(1, v.k))
    return {
      k,
      x: Math.min(0, Math.max(width - width * k, v.x)),
      y: Math.min(0, Math.max(height - height * k, v.y)),
    }
  }

  function toSvg(clientX: number, clientY: number) {
    const r = svgRef.current!.getBoundingClientRect()
    return { x: ((clientX - r.left) * width) / r.width, y: ((clientY - r.top) * height) / r.height }
  }

  function zoomAt(p: { x: number; y: number }, factor: number) {
    setView((v) => {
      const k = Math.min(MAX_ZOOM, Math.max(1, v.k * factor))
      const f = k / v.k
      return clampView({ k, x: p.x - (p.x - v.x) * f, y: p.y - (p.y - v.y) * f })
    })
  }

  // La rueda necesita un listener no pasivo para poder evitar el scroll de la página
  useEffect(() => {
    const svg = svgRef.current
    if (!zoomable || !svg) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      zoomAt(toSvg(e.clientX, e.clientY), Math.exp(-e.deltaY * 0.0025))
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  })

  const pointerHandlers = zoomable
    ? {
        onPointerDown: (e: React.PointerEvent) => {
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
          if (pointers.current.size === 1) gesture.current.moved = false
          gesture.current.pinch = 0
        },
        onPointerMove: (e: React.PointerEvent) => {
          const prev = pointers.current.get(e.pointerId)
          if (!prev) return
          const r = svgRef.current!.getBoundingClientRect()
          const scale = width / r.width
          if (pointers.current.size === 1) {
            const dx = (e.clientX - prev.x) * scale
            const dy = (e.clientY - prev.y) * scale
            if (Math.abs(dx) + Math.abs(dy) > 0.5) {
              if (!gesture.current.moved && Math.hypot(dx, dy) < 3) return
              gesture.current.moved = true
              setView((v) => clampView({ ...v, x: v.x + dx, y: v.y + dy }))
            }
          }
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
          if (pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()]
            const dist = Math.hypot(a.x - b.x, a.y - b.y)
            if (gesture.current.pinch) zoomAt(toSvg((a.x + b.x) / 2, (a.y + b.y) / 2), dist / gesture.current.pinch)
            gesture.current.pinch = dist
            gesture.current.moved = true
          }
        },
        onPointerUp: (e: React.PointerEvent) => {
          pointers.current.delete(e.pointerId)
          gesture.current.pinch = 0
        },
        onPointerCancel: (e: React.PointerEvent) => {
          pointers.current.delete(e.pointerId)
        },
        onPointerLeave: (e: React.PointerEvent) => {
          pointers.current.delete(e.pointerId)
        },
      }
    : {}

  const svg = (
    <svg
      ref={svgRef}
      className={`world-map ${onSelect ? 'clickable' : ''} ${zoomable ? 'zoomable' : ''} ${className ?? ''}`}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Mapa"
      {...pointerHandlers}
    >
      <rect width={width} height={height} className="sea" />
      <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
        {paths.map(({ code, d }) => {
          const color = fill?.(code)
          return (
            <path
              key={code}
              d={d}
              className={color ? 'country highlighted' : 'country'}
              style={color ? { fill: color } : undefined}
              onClick={
                onSelect && !code.startsWith('X')
                  ? () => {
                      if (!gesture.current.moved) onSelect(code)
                    }
                  : undefined
              }
            />
          )
        })}
        {ringShape && (
          <circle
            className="ring"
            cx={ringShape.cx}
            cy={ringShape.cy}
            r={14 / view.k}
            style={{ strokeWidth: 2 / view.k }}
          />
        )}
      </g>
    </svg>
  )

  if (!zoomable) return svg

  return (
    <div className="map-wrap">
      {svg}
      <div className="zoom-controls">
        <button aria-label="Acercar" onClick={() => zoomAt({ x: width / 2, y: height / 2 }, 1.6)}>
          +
        </button>
        <button aria-label="Alejar" onClick={() => zoomAt({ x: width / 2, y: height / 2 }, 1 / 1.6)}>
          −
        </button>
        <button aria-label="Restablecer" className="reset" onClick={() => setView({ k: 1, x: 0, y: 0 })}>
          ⟲
        </button>
      </div>
    </div>
  )
}

export const WorldMap = memo(WorldMapInner)

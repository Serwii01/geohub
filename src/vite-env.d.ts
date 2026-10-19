/// <reference types="vite/client" />

declare module 'world-atlas/countries-50m.json' {
  import type { Topology, GeometryCollection } from 'topojson-specification'
  const topology: Topology<{ countries: GeometryCollection; land: GeometryCollection }>
  export default topology
}

declare module '*.json' {
  const value: unknown
  export default value
}

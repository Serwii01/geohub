import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // El TopoJSON del mundo (~230 KB gzip) se carga bajo demanda en su propio chunk
  build: { chunkSizeWarningLimit: 800 },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/Ultimate-Crash-0.1/',
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api/opentopodata': {
        target: 'https://api.opentopodata.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/opentopodata/, '')
      },
      '/api/openelevation': {
        target: 'https://api.open-elevation.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/openelevation/, '')
      }
    }
  }
})
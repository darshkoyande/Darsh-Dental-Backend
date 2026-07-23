import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      // Forward all backend API paths to the FastAPI server
      '/api':           'http://localhost:8000',
      '/auth':          'http://localhost:8000',
      '/chat':          'http://localhost:8000',
      '/notifications': 'http://localhost:8000',
      '/patients':      'http://localhost:8000',
      '/charts':        'http://localhost:8000',
      '/appointments':  'http://localhost:8000',
      '/imaging':       'http://localhost:8000',
      '/reports':       'http://localhost:8000',
      '/fhir':          'http://localhost:8000',
      '/abdm':          'http://localhost:8000',
      '/audit-logs':    'http://localhost:8000',
      '/uploads':       'http://localhost:8000',
      '/diagnoses':     'http://localhost:8000',
    },
  },
})
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
      // Proxy now targets the local backend we started on port 8010
      '/api':           'http://127.0.0.1:8010',
      '/auth':          'http://127.0.0.1:8010',
      '/chat':          'http://127.0.0.1:8010',
      '/notifications': 'http://127.0.0.1:8010',
      '/patients':      'http://127.0.0.1:8010',
      '/charts':        'http://127.0.0.1:8010',
      '/appointments':  'http://127.0.0.1:8010',
      '/imaging':       'http://127.0.0.1:8010',
      '/reports':       'http://127.0.0.1:8010',
      '/fhir':          'http://127.0.0.1:8010',
      '/abdm':          'http://127.0.0.1:8010',
      '/audit-logs':    'http://127.0.0.1:8010',
      '/uploads':       'http://127.0.0.1:8010',
      '/diagnoses':     'http://127.0.0.1:8010',
    },
  },
})
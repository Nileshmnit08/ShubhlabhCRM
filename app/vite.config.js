import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2015',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          icons: ['lucide-react'],
          charts: ['recharts'],
          supabase: ['@supabase/supabase-js'],
          pdf: ['pdfjs-dist'],
          geo: ['country-state-city']
        }
      }
    },
    chunkSizeWarningLimit: 15000
  }
})

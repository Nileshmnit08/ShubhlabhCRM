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
          ui: ['lucide-react', 'recharts', 'date-fns'],
          supabase: ['@supabase/supabase-js'],
          pdf: ['pdfjs-dist']
        }
      }
    },
    chunkSizeWarningLimit: 15000
  }
})

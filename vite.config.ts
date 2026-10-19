import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-maps': ['maplibre-gl'],
          'vendor-icons': ['lucide-react'],
          'vendor-excel': ['xlsx', 'xlsx-js-style'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})

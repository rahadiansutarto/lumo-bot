import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  publicDir: '../public',
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.LUMO_API_URL ?? 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
})

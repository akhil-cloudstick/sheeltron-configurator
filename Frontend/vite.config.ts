import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
    // The repo lives on a network share (UNC mapped to a drive letter). Native
    // fs events don't work there and crash Vite's watcher, so poll instead.
    watch: {
      usePolling: true,
      interval: 200,
    },
  },
})

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
    // The repo is a UNC share mapped to *two* drive letters (S: and Y:). Vite
    // realpaths resolved files, and Windows canonicalizes the share to Y:,
    // which then mismatches the S: root and breaks loading (`Failed to load
    // url /src/main.tsx`). Skip the realpath so paths stay on the launch drive.
    preserveSymlinks: true,
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

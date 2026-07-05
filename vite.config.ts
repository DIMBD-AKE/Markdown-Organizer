import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  root: 'src/renderer',
  base: './',
  resolve: {
    alias: {
      '@renderer': resolve('src/renderer/src'),
      path: 'path-browserify'
    }
  },
  plugins: [react(), tailwindcss()],
  build: {
    outDir: '../../dist',
    emptyOutDir: true
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true
  }
})

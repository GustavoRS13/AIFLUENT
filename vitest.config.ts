import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // next-auth (beta) imports the bare specifier "next/server" internally,
    // which Vitest's Node resolver cannot resolve. Inlining lets Vite transform
    // and resolve it via the package exports map.
    server: {
      deps: {
        inline: [/next-auth/, /@auth\/core/],
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

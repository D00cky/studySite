/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// A SPA fala com a API Spring pela mesma origem (proxy no dev), então cookies de
// sessão e CSRF funcionam sem CORS.
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        // Bibliotecas em chunks próprios: mudam pouco e ficam em cache entre deploys.
        advancedChunks: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler|react-router)[\\/]/ },
            { name: 'query', test: /node_modules[\\/]@tanstack[\\/]/ },
            { name: 'markdown', test: /node_modules[\\/](react-markdown|remark-.*|rehype-.*|mdast-.*|micromark.*|unified|hast-.*|unist-.*|vfile.*|property-information|decode-named-character-reference|character-entities.*)[\\/]/ },
          ],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
      '/actuator': 'http://localhost:8080',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})

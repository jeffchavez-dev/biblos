import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Replace the existing kill-switch sw.js
      filename: 'sw.js',
      workbox: {
        // Pre-cache built assets; images are runtime-cached on demand
        globPatterns: ['**/*.{js,css,html,woff,woff2}'],
        globIgnores: ['**/vocab-images/**', '**/story-images/**', '**/biblos-kids-images/**', '**/sounds/**'],
        // Runtime cache for vocab images — cache-first, loaded on demand
        runtimeCaching: [
          {
            urlPattern: /\/vocab-images\/.+\.(jpe?g|png|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'vocab-images',
              expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /\/src\/data\/.+\.json$/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'data-json' },
          },
        ],
      },
      manifest: {
        name: 'Βίβλος',
        short_name: 'Βίβλος',
        description: 'Koine Greek language learning',
        theme_color: '#1a2d4e',
        background_color: '#f5f0e8',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  server: { port: 5173, strictPort: true },
})

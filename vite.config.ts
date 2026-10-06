import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Cartoon Check',
        short_name: 'Cartoon Check',
        description:
          'Adicione. Marque. Comemore. Suas compras, no seu dispositivo.',
        lang: 'pt-BR',
        display: 'standalone',
        theme_color: '#fff8eb',
        background_color: '#fff8eb',
        scope: '/',
        start_url: '/app',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: false,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,woff2,svg,png,webmanifest}'],
        navigateFallback: '/index.html',
        navigateFallbackAllowlist: [
          /^\/$/,
          /^\/onboarding\/?$/,
          /^\/restore\/?$/,
          /^\/app(?:\/.*)?$/,
        ],
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
      },
      devOptions: { enabled: false },
    }),
  ],
  optimizeDeps: {
    include: [
      'dexie',
      'zod',
      'dexie-react-hooks',
      'react-router',
      'motion/react',
      '@radix-ui/react-dialog',
    ],
  },
})

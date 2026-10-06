import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const manifest: unknown = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
)
if (
  typeof manifest !== 'object' ||
  manifest === null ||
  !('version' in manifest) ||
  typeof manifest.version !== 'string'
)
  throw new Error('package.json has no version.')

// The preview server sends the security headers of the hosting configuration,
// so the production tests run under the real content security policy.
function hostingHeaders() {
  const hosting: unknown = JSON.parse(
    readFileSync(new URL('./vercel.json', import.meta.url), 'utf8'),
  )
  const rules: unknown[] =
    typeof hosting === 'object' &&
    hosting !== null &&
    'headers' in hosting &&
    Array.isArray(hosting.headers)
      ? hosting.headers
      : []
  const headers: Record<string, string> = {}
  for (const rule of rules) {
    if (
      typeof rule !== 'object' ||
      rule === null ||
      !('source' in rule) ||
      rule.source !== '/(.*)' ||
      !('headers' in rule) ||
      !Array.isArray(rule.headers)
    )
      continue
    const entries: unknown[] = rule.headers
    for (const entry of entries)
      if (
        typeof entry === 'object' &&
        entry !== null &&
        'key' in entry &&
        'value' in entry &&
        typeof entry.key === 'string' &&
        typeof entry.value === 'string'
      )
        headers[entry.key] = entry.value
  }
  return headers
}

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(manifest.version) },
  preview: { headers: hostingHeaders() },
  build: {
    rolldownOptions: {
      output: {
        // Libraries change less often than the app, so they get chunks of their
        // own: an update then downloads only what actually changed.
        codeSplitting: {
          groups: [
            {
              name: 'react',
              test: /node_modules[\\/](?:react|react-dom|scheduler)[\\/]/,
            },
            { name: 'router', test: /node_modules[\\/]react-router[\\/]/ },
            {
              name: 'data',
              test: /node_modules[\\/](?:dexie|dexie-react-hooks|zod)[\\/]/,
            },
          ],
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '/app',
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
        // Matched against the path and the query string, so each route also
        // accepts a query: a draft is resumed at /app?new=1, for example.
        navigateFallbackAllowlist: [
          /^\/(?:\?.*)?$/,
          /^\/onboarding\/?(?:\?.*)?$/,
          /^\/restore\/?(?:\?.*)?$/,
          /^\/app(?:[/?].*)?$/,
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

import { createServer } from 'node:http'
import { readFile, writeFile, cp, mkdir } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { generateSW } from 'workbox-build'

const root = resolve('dist')
const next = resolve('.local/pwa-update-release')
await mkdir(next, { recursive: true })
await cp(root, next, { recursive: true, force: true })
const html = await readFile(resolve(next, 'index.html'), 'utf8')
await writeFile(
  resolve(next, 'index.html'),
  html.replace('</head>', '<!-- cartoon-check-test-release-b --></head>'),
)
await generateSW({
  globDirectory: next,
  globPatterns: ['**/*.{js,css,html,woff2,svg,png,webmanifest}'],
  globIgnores: ['sw.js', 'workbox-*.js'],
  swDest: resolve(next, 'sw.js'),
  cleanupOutdatedCaches: true,
  skipWaiting: false,
  clientsClaim: true,
  navigateFallback: '/index.html',
  navigateFallbackAllowlist: [
    /^\/$/,
    /^\/app(?:\/.*)?$/,
    /^\/onboarding\/?$/,
    /^\/restore\/?$/,
  ],
})
let active = root
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
}
const server = createServer((request, response) => {
  void (async () => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1:4175')
    if (url.pathname === '/__release/a' || url.pathname === '/__release/b') {
      active = url.pathname.endsWith('/a') ? root : next
      response.writeHead(200)
      response.end('ready')
      return
    }
    const path = /^\/(?:$|app(?:\/.*)?$|onboarding\/?$|restore\/?$)/.test(
      url.pathname,
    )
      ? 'index.html'
      : decodeURIComponent(url.pathname).replace(/^\//, '')
    const file = resolve(active, path)
    if (!file.startsWith(active + sep)) {
      response.writeHead(403)
      response.end()
      return
    }
    try {
      const bytes = await readFile(file)
      response.writeHead(200, {
        'Content-Type': mime[extname(file)] ?? 'application/octet-stream',
        'Cache-Control': 'no-store',
      })
      response.end(bytes)
    } catch {
      response.writeHead(404)
      response.end()
    }
  })().catch(() => {
    response.writeHead(500)
    response.end()
  })
})
server.listen(4175, '127.0.0.1', () => {
  process.stdout.write('Update fixtures ready on http://127.0.0.1:4175\n')
})
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    server.close(() => process.exit(0))
  })

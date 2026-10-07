// Checks the size budgets of the production build in dist/:
// the JavaScript needed to show the first screen, and everything the service
// worker stores so the app works offline.
import { readFile, stat } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'

const KiB = 1024
const budgets = {
  initialScript: 220 * KiB,
  precache: 2.5 * 1024 * KiB,
}
const dist = new URL('../dist/', import.meta.url)
const asset = (path) => new URL(path.replace(/^\//, ''), dist)

// The page announces the entry and the chunks it imports statically.
const html = await readFile(asset('index.html'), 'utf8')
const scripts = Array.from(
  html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="([^"]+\.js)"/g),
  (match) => match[1],
)
if (scripts.length === 0)
  throw new Error('No scripts found in dist/index.html.')
let initialScript = 0
for (const script of scripts)
  initialScript += gzipSync(await readFile(asset(script))).byteLength

// The generated service worker lists every file it precaches.
const worker = await readFile(asset('sw.js'), 'utf8')
const cached = Array.from(
  new Set(Array.from(worker.matchAll(/url:"([^"]+)"/g), (match) => match[1])),
)
if (cached.length === 0)
  throw new Error('No precache entries found in dist/sw.js.')
let precache = 0
for (const file of cached) precache += (await stat(asset(file))).size

const rows = [
  ['Initial JavaScript (gzip)', initialScript, budgets.initialScript, scripts],
  ['Offline precache', precache, budgets.precache, cached],
]
let failed = false
for (const [name, size, budget, files] of rows) {
  const within = size <= budget
  failed ||= !within
  console.log(
    `${within ? 'ok  ' : 'OVER'} ${name}: ${(size / KiB).toFixed(1)} KiB of ` +
      `${(budget / KiB).toFixed(0)} KiB in ${String(files.length)} files`,
  )
}
if (failed) {
  console.error('A size budget was exceeded.')
  process.exitCode = 1
}

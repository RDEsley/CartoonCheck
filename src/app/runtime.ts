import { CartoonCheckDatabase } from '../db/database'
import { getCommandContext } from '../db/context'
import type { CommandContext } from '../db/context'
import {
  acquireSession,
  initializeSession,
  releaseSession,
} from '../pwa/session'
import { draftIsSafe } from '../pwa/drafts'

const listeners = new Set<() => void>()
export const database = new CartoonCheckDatabase(undefined, () => {
  for (const listener of listeners) listener()
})
export function subscribeDatabase(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
let initialization: Promise<CommandContext> | undefined
export function initializeRuntime() {
  initialization ??= initializeSession((allow) =>
    database.initialize(allow),
  ).then(() => getCommandContext(database))
  return initialization
}
let lastController: ServiceWorker | null = null
window.addEventListener('pagehide', () => {
  lastController =
    'serviceWorker' in navigator ? navigator.serviceWorker.controller : null
  database.close()
  void releaseSession()
})
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    if (
      'serviceWorker' in navigator &&
      lastController !== navigator.serviceWorker.controller
    ) {
      if (draftIsSafe()) location.reload()
      return
    }
    void acquireSession()
      .then(() => database.initialize(false))
      .catch(() => undefined)
  }
})

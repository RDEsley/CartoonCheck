import { registerSW } from 'virtual:pwa-register'
import { exclusiveUpdate } from './session'
import { hasPendingOperations, pauseOperations } from './operations'
import { draftIsSafe } from './drafts'
const listeners = new Set<() => void>()
let status = {
  offlineReady: false,
  needRefresh: false,
  deferred: false,
  updating: false,
  message: '',
}
function change(fields: Partial<typeof status>) {
  status = { ...status, ...fields }
  for (const listener of listeners) listener()
}
export function subscribePwa(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
export function getPwaStatus() {
  return status
}
const update = registerSW({
  onNeedReload: () => {
    change({ needRefresh: true })
  },
  immediate: true,
  onOfflineReady: () => {
    change({ offlineReady: true })
  },
  onNeedRefresh: () => {
    change({ needRefresh: true, deferred: false })
  },
  onRegisteredSW: (_url, registration) => {
    if (registration?.active) change({ offlineReady: true })
    const check = () => {
      if (!document.hidden) void registration?.update().catch(() => undefined)
    }
    document.addEventListener('visibilitychange', check)
  },
  onRegisterError: () => {
    change({
      message:
        'Não conseguimos preparar o uso offline. Tente reabrir quando estiver conectado.',
    })
  },
})
/** Hides the offer until the app is opened again or another version arrives. */
export function deferUpdate() {
  change({ deferred: true, message: '' })
}
// How long the new version may take to assume control. Running out of time
// never approves the update; it only gives the session back to the user.
const activationTime = 15_000
function activateWaitingWorker() {
  return new Promise<void>((resolve, reject) => {
    const controlled = () => {
      clearTimeout(timer)
      resolve()
      location.reload()
    }
    const timer = setTimeout(() => {
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        controlled,
      )
      reject(new Error('The new version did not take control in time.'))
    }, activationTime)
    navigator.serviceWorker.addEventListener('controllerchange', controlled, {
      once: true,
    })
    void update(true).catch(reject)
  })
}
export async function applyUpdate() {
  if (!draftIsSafe()) {
    change({ message: 'Salve ou descarte seu rascunho antes de atualizar.' })
    return
  }
  if (hasPendingOperations()) {
    change({ message: 'Espere terminar a gravação antes de atualizar.' })
    return
  }
  change({ updating: true, message: '' })
  pauseOperations(true)
  try {
    const applied = await exclusiveUpdate(async () => {
      if (hasPendingOperations()) throw new Error('Save in progress')
      const registration = await navigator.serviceWorker.getRegistration()
      // Without a waiting worker another tab already activated the new
      // version, so this page only has to load it.
      if (registration?.waiting) await activateWaitingWorker()
      else location.reload()
    })
    if (!applied)
      change({
        updating: false,
        message:
          'Feche outras abas do Cartoon Check e tente novamente. Se seu navegador não permite atualizar aqui, feche e reabra o aplicativo.',
      })
  } catch {
    change({
      updating: false,
      message:
        'A atualização não terminou. Seus dados continuam salvos; tente novamente.',
    })
  } finally {
    if (!status.updating) pauseOperations(false)
  }
}

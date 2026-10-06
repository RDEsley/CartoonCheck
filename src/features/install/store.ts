interface InstallPrompt extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
const listeners = new Set<() => void>()
let prompt: InstallPrompt | null = null
let installed =
  matchMedia('(display-mode: standalone)').matches ||
  ('standalone' in navigator && navigator.standalone === true)
let state = { available: false, installed }
function notify() {
  state = { available: prompt !== null, installed }
  for (const listener of listeners) listener()
}
function isInstallPrompt(event: Event): event is InstallPrompt {
  return (
    'prompt' in event &&
    typeof event.prompt === 'function' &&
    'userChoice' in event
  )
}
window.addEventListener('beforeinstallprompt', (event) => {
  if (isInstallPrompt(event)) {
    event.preventDefault()
    prompt = event
    notify()
  }
})
window.addEventListener('appinstalled', () => {
  installed = true
  prompt = null
  notify()
})
export function subscribeInstall(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
export function getInstallState() {
  return state
}
export async function requestInstall() {
  const event = prompt
  if (event === null) return
  prompt = null
  notify()
  await event.prompt()
  await event.userChoice
}
export function isIos() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

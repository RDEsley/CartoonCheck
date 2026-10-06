import { useSyncExternalStore } from 'react'
const query = '(prefers-reduced-motion: reduce)'
function subscribe(listener: () => void) {
  const media = matchMedia(query)
  media.addEventListener('change', listener)
  return () => {
    media.removeEventListener('change', listener)
  }
}
/** Whether the system asks for reduced motion. It follows changes while the app is open. */
export function useSystemReducedMotion() {
  return useSyncExternalStore(subscribe, () => matchMedia(query).matches)
}

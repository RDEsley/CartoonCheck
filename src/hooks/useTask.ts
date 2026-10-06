import { useRef, useState } from 'react'
import { errorMessage } from '../lib/error-message'
export function useTask() {
  const running = useRef(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  async function run<T>(task: () => Promise<T>, after?: (result: T) => void) {
    if (running.current) return
    running.current = true
    setPending(true)
    setError('')
    try {
      const result = await task()
      after?.(result)
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      running.current = false
      setPending(false)
    }
  }
  return { pending, error, run }
}

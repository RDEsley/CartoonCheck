import { useRef, useState } from 'react'
import { errorMessage } from '../lib/error-message'
export function useTask() {
  const running = useRef(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  async function run<T>(task: () => Promise<T>, after?: (result: T) => void) {
    if (running.current) return false
    running.current = true
    setPending(true)
    setError('')
    try {
      const result = await task()
      after?.(result)
      return true
    } catch (reason) {
      setError(errorMessage(reason))
      return false
    } finally {
      running.current = false
      setPending(false)
    }
  }
  return { pending, error, run }
}

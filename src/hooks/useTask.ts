import { useRef, useState } from 'react'
import { errorMessage } from '../lib/error-message'
import { beginOperation, operationsPaused } from '../pwa/operations'
export function useTask() {
  const running = useRef(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  async function run<T>(task: () => Promise<T>, after?: (result: T) => void) {
    if (operationsPaused()) {
      setError('Espere a atualização terminar antes de salvar.')
      return false
    }
    if (running.current) return false
    running.current = true
    const finish = beginOperation()
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
      finish()
      running.current = false
      setPending(false)
    }
  }
  const clearError = () => {
    setError('')
  }
  return { pending, error, run, clearError }
}

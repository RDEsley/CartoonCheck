import { createContext, useContext } from 'react'
import type { PurchaseResult } from '../features/items/commands'
export const CelebrationContext = createContext<{
  purchase: (result: PurchaseResult, rect: DOMRect) => void
  cancel: () => void
} | null>(null)
export function useCelebrations() {
  const value = useContext(CelebrationContext)
  if (value === null) throw new Error('Celebration provider is required.')
  return value
}

import { createContext, useContext } from 'react'
import type { PurchaseResult } from '../features/items/commands'
export interface Celebrations {
  purchase: (result: PurchaseResult, rect: DOMRect) => void
  cancel: () => void
}
export const CelebrationContext = createContext<Celebrations | null>(null)
export function useCelebrations() {
  const value = useContext(CelebrationContext)
  if (value === null) throw new Error('Celebration provider is required.')
  return value
}

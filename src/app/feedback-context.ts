import { createContext, useContext } from 'react'
import type { UndoAction } from '../features/items/undo'
export interface Feedback {
  show: (message: string, action?: UndoAction) => void
  dismiss: () => void
}
export const FeedbackContext = createContext<Feedback | null>(null)
export function useFeedback() {
  const feedback = useContext(FeedbackContext)
  if (feedback === null) throw new Error('Feedback provider is required.')
  return feedback
}

import { createContext, useContext } from 'react'
import type { ShoppingList } from '../db/models'
import type { UndoAction } from '../features/items/undo'
/** The single action the feedback bar can undo. `list` is the state after the change. */
export type FeedbackAction = UndoAction | { kind: 'archive'; list: ShoppingList }
export interface Feedback {
  show: (message: string, action?: FeedbackAction) => void
  dismiss: () => void
}
export const FeedbackContext = createContext<Feedback | null>(null)
export function useFeedback() {
  const feedback = useContext(FeedbackContext)
  if (feedback === null) throw new Error('Feedback provider is required.')
  return feedback
}

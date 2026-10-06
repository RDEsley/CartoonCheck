import { createContext, useContext } from 'react'
import type { CartoonCheckDatabase } from '../db/database'
import type { CommandContext } from '../db/context'
import type { Profile } from '../db/models'
export interface Runtime {
  db: CartoonCheckDatabase
  context: CommandContext
  profile: Profile | null
}
export const RuntimeContext = createContext<Runtime | null>(null)
export function useRuntime() {
  const value = useContext(RuntimeContext)
  if (value === null) throw new Error('Runtime provider is required.')
  return value
}

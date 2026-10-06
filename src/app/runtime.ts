import { CartoonCheckDatabase } from '../db/database'
import { getCommandContext } from '../db/context'
import type { CommandContext } from '../db/context'

const listeners = new Set<() => void>()
export const database = new CartoonCheckDatabase(undefined, () => {
  for (const listener of listeners) listener()
})
export function subscribeDatabase(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
let initialization: Promise<CommandContext> | undefined
export function initializeRuntime() {
  initialization ??= database
    .initialize()
    .then(() => getCommandContext(database))
  return initialization
}

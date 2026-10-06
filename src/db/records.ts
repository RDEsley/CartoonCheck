import type { CartoonCheckDatabase } from './database'
import { DataError } from './errors'
import { listSchema } from './models'
import type { ShoppingList } from './models'

export async function requireProfile(db: CartoonCheckDatabase) {
  const profiles = await db.profile.limit(2).toArray()
  if (profiles.length > 1) {
    throw new DataError('INVALID_DATABASE', 'More than one local profile was found.')
  }
  const profile = profiles[0]
  if (!profile) throw new DataError('PROFILE_REQUIRED', 'Create a local profile first.')
  return profile
}

export async function requireList(db: CartoonCheckDatabase, id: string, editable = false) {
  const list = await db.lists.get(id)
  if (!list) throw new DataError('NOT_FOUND', 'The list no longer exists.')
  if (editable && list.status === 'archived') {
    throw new DataError('ARCHIVED_LIST', 'Reactivate the list before editing it.')
  }
  return list
}

export async function requireItem(db: CartoonCheckDatabase, id: string) {
  const item = await db.items.get(id)
  if (!item) throw new DataError('NOT_FOUND', 'The item no longer exists.')
  return item
}

export async function touchList(db: CartoonCheckDatabase, list: ShoppingList, time: number) {
  const updated = listSchema.parse({ ...list, updatedAt: time, revision: list.revision + 1 })
  await db.lists.put(updated)
  return updated
}

import Dexie from 'dexie'
import type { CartoonCheckDatabase } from '../../db/database'
import { assertDatabaseReady } from '../../db/context'
import type { ShoppingList } from '../../db/models'

export interface ListSummary {
  list: ShoppingList
  pendingCount: number
  purchasedCount: number
  progress: number | null
}

/** A percentage that only reaches 100 when nothing is pending and 0 when nothing was bought. */
export function listProgress(
  purchasedCount: number,
  total: number,
): number | null {
  if (total === 0) return null
  if (purchasedCount >= total) return 100
  if (purchasedCount <= 0) return 0
  return Math.min(99, Math.max(1, Math.round((purchasedCount / total) * 100)))
}

export async function getListIds(
  db: CartoonCheckDatabase,
  status: ShoppingList['status'] = 'active',
) {
  assertDatabaseReady(db)
  return db.lists
    .where('[status+updatedAt]')
    .between([status, Dexie.minKey], [status, Dexie.maxKey])
    .reverse()
    .primaryKeys()
}

export async function getListSummary(
  db: CartoonCheckDatabase,
  id: string,
): Promise<ListSummary | null> {
  assertDatabaseReady(db)
  return db.transaction('r', [db.lists, db.items], async () => {
    const list = await db.lists.get(id)
    if (!list) return null
    const [total, pendingCount] = await Promise.all([
      db.items.where('listId').equals(id).count(),
      db.items
        .where('[listId+status+createdAt]')
        .between([id, 'pending', Dexie.minKey], [id, 'pending', Dexie.maxKey])
        .count(),
    ])
    const purchasedCount = total - pendingCount
    return {
      list,
      pendingCount,
      purchasedCount,
      progress: listProgress(purchasedCount, total),
    }
  })
}

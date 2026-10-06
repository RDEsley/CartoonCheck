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

export async function getListIds(db: CartoonCheckDatabase, status: ShoppingList['status'] = 'active') {
  assertDatabaseReady(db)
  return db.lists.where('[status+updatedAt]')
    .between([status, Dexie.minKey], [status, Dexie.maxKey]).reverse().primaryKeys()
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
      db.items.where('[listId+status+createdAt]')
        .between([id, 'pending', Dexie.minKey], [id, 'pending', Dexie.maxKey]).count(),
    ])
    const purchasedCount = total - pendingCount
    return { list, pendingCount, purchasedCount,
      progress: total === 0 ? null : Math.round(purchasedCount / total * 100) }
  })
}

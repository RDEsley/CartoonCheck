import Dexie from 'dexie'
import type { CartoonCheckDatabase } from '../../db/database'
import { assertDatabaseReady } from '../../db/context'
import type { ShoppingItem } from '../../db/models'

export async function getItemIds(
  db: CartoonCheckDatabase,
  listId: string,
  status: ShoppingItem['status'],
) {
  assertDatabaseReady(db)
  const query = db.items
    .where(
      status === 'pending'
        ? '[listId+status+createdAt]'
        : '[listId+status+purchasedAt]',
    )
    .between([listId, status, Dexie.minKey], [listId, status, Dexie.maxKey])
  return (status === 'purchased' ? query.reverse() : query).primaryKeys()
}

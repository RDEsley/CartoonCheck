import Dexie from 'dexie'
import { z } from 'zod'
import type { CartoonCheckDatabase } from '../../db/database'
import { assertDatabaseReady } from '../../db/context'

const pageSchema = z
  .number()
  .int()
  .nonnegative()
  .max(Math.floor(Number.MAX_SAFE_INTEGER / 50))

export async function getHistoryCount(db: CartoonCheckDatabase) {
  assertDatabaseReady(db)
  return db.history.count()
}

export async function getHistoryPage(
  db: CartoonCheckDatabase,
  page = 0,
  listId?: string,
) {
  assertDatabaseReady(db)
  const offset = pageSchema.parse(page) * 50
  const query =
    listId === undefined
      ? db.history.orderBy('occurredAt')
      : db.history
          .where('[listId+occurredAt]')
          .between([listId, Dexie.minKey], [listId, Dexie.maxKey])
  return query.reverse().offset(offset).limit(50).toArray()
}

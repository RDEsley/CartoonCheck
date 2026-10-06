import type { CartoonCheckDatabase } from '../../db/database'
import {
  assertDatabaseReady,
  assertDataset,
  assertRevision,
  updatedTime,
} from '../../db/context'
import type { CommandContext } from '../../db/context'
import { DataError } from '../../db/errors'
import { appendHistory } from '../../db/history'
import { itemSchema } from '../../db/models'
import { requireItem, requireList, touchList } from '../../db/records'
import type { DeletedItem, PurchaseResult } from './commands'

export type UndoAction =
  | { kind: 'purchase'; result: PurchaseResult }
  | { kind: 'delete'; snapshot: DeletedItem }
export async function undoItemAction(
  db: CartoonCheckDatabase,
  context: CommandContext,
  action: UndoAction,
) {
  assertDatabaseReady(db)
  return db.transaction(
    'rw',
    [db.meta, db.lists, db.items, db.assets, db.history],
    async () => {
      await assertDataset(db, context)
      const expected =
        action.kind === 'delete' ? action.snapshot.item : action.result.item
      const list = await requireList(db, expected.listId, true)
      const time = updatedTime(expected.updatedAt, list.updatedAt)
      if (action.kind === 'delete') {
        if (await db.items.get(expected.id))
          throw new DataError(
            'CONFLICT',
            'This item has already been restored.',
          )
        const photo = action.snapshot.photo
        if (expected.photoId !== null && photo === null)
          throw new DataError(
            'INVALID_DATABASE',
            'The deleted image is missing.',
          )
        if (photo !== null) await db.assets.add(photo)
        const restored = itemSchema.parse({
          ...expected,
          revision: expected.revision + 1,
          updatedAt: time,
        })
        await db.items.add(restored)
        await appendHistory(db, 'item_restored', list, time, restored)
      } else {
        const current = await requireItem(db, expected.id)
        assertRevision(current.revision, expected.revision)
        if (!action.result.changed)
          throw new DataError('CONFLICT', 'There is no purchase to undo.')
        const restored = itemSchema.parse({
          ...current,
          ...action.result.previousPurchase,
          revision: current.revision + 1,
          updatedAt: time,
        })
        await db.items.put(restored)
        await appendHistory(
          db,
          restored.status === 'purchased'
            ? 'item_purchased'
            : 'item_purchase_undone',
          list,
          time,
          restored,
        )
      }
      await touchList(db, list, time)
    },
  )
}

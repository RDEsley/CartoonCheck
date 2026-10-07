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
import { createListSchema, listSchema, updateListSchema } from '../../db/models'
import type {
  CreateListInput,
  ShoppingList,
  UpdateListInput,
} from '../../db/models'
import { requireList, requireProfile } from '../../db/records'
import { createId } from '../../lib/create-id'

export async function createList(
  db: CartoonCheckDatabase,
  context: CommandContext,
  input: CreateListInput,
): Promise<ShoppingList> {
  const fields = createListSchema.parse(input)
  assertDatabaseReady(db)
  return db.transaction(
    'rw',
    [db.meta, db.profile, db.lists, db.history],
    async () => {
      await assertDataset(db, context)
      await requireProfile(db)
      const time = Date.now()
      const list = listSchema.parse({
        ...fields,
        id: createId(),
        status: 'active',
        createdAt: time,
        updatedAt: time,
        revision: 1,
      })
      await db.lists.add(list)
      await appendHistory(db, 'list_created', list, time)
      return list
    },
  )
}

export async function updateList(
  db: CartoonCheckDatabase,
  context: CommandContext,
  id: string,
  input: UpdateListInput,
  expectedRevision: number,
): Promise<ShoppingList> {
  const fields = updateListSchema.parse(input)
  assertDatabaseReady(db)
  return db.transaction('rw', [db.meta, db.lists, db.items], async () => {
    await assertDataset(db, context)
    const current = await requireList(db, id, true)
    assertRevision(current.revision, expectedRevision)
    const currencyChanged =
      fields.currency !== undefined && fields.currency !== current.currency
    if (currencyChanged) {
      const pricedItem = await db.items
        .where('listId')
        .equals(id)
        .filter(
          (item) =>
            item.plannedPriceMinor !== null || item.paidPriceMinor !== null,
        )
        .first()
      if (pricedItem) {
        throw new DataError(
          'CURRENCY_LOCKED',
          'Remove prices before changing the list currency.',
        )
      }
    }
    // A new main currency drops the old exchange pair unless this edit provides one.
    const list = listSchema.parse({
      ...current,
      ...(currencyChanged
        ? { secondaryCurrency: null, manualExchangeRate: null }
        : {}),
      ...fields,
      updatedAt: updatedTime(current.updatedAt),
      revision: current.revision + 1,
    })
    await db.lists.put(list)
    return list
  })
}

async function setArchived(
  db: CartoonCheckDatabase,
  context: CommandContext,
  id: string,
  archived: boolean,
  expectedRevision?: number,
): Promise<ShoppingList> {
  assertDatabaseReady(db)
  return db.transaction('rw', [db.meta, db.lists, db.history], async () => {
    await assertDataset(db, context)
    const current = await requireList(db, id)
    if (expectedRevision !== undefined)
      assertRevision(current.revision, expectedRevision)
    const status = archived ? 'archived' : 'active'
    if (current.status === status) return current
    const list = listSchema.parse({
      ...current,
      status,
      updatedAt: updatedTime(current.updatedAt),
      revision: current.revision + 1,
    })
    await db.lists.put(list)
    await appendHistory(
      db,
      archived ? 'list_archived' : 'list_reactivated',
      list,
      list.updatedAt,
    )
    return list
  })
}

export function archiveList(
  db: CartoonCheckDatabase,
  context: CommandContext,
  id: string,
) {
  return setArchived(db, context, id, true)
}

export function reactivateList(
  db: CartoonCheckDatabase,
  context: CommandContext,
  id: string,
) {
  return setArchived(db, context, id, false)
}

/** Reverts an archive or reactivation, given the list as that change left it. */
export function undoArchiveChange(
  db: CartoonCheckDatabase,
  context: CommandContext,
  changed: ShoppingList,
) {
  return setArchived(
    db,
    context,
    changed.id,
    changed.status !== 'archived',
    changed.revision,
  )
}

export async function deleteList(
  db: CartoonCheckDatabase,
  context: CommandContext,
  id: string,
  expectedRevision: number,
): Promise<ShoppingList> {
  assertDatabaseReady(db)
  return db.transaction(
    'rw',
    [db.meta, db.lists, db.items, db.assets, db.history],
    async () => {
      await assertDataset(db, context)
      const list = await requireList(db, id)
      assertRevision(list.revision, expectedRevision)
      const items = await db.items.where('listId').equals(id).toArray()
      const photoIds = items.flatMap((item) =>
        item.photoId === null ? [] : [item.photoId],
      )
      await db.assets.bulkDelete(photoIds)
      await db.items.where('listId').equals(id).delete()
      await db.lists.delete(id)
      await appendHistory(db, 'list_deleted', list, updatedTime(list.updatedAt))
      return list
    },
  )
}

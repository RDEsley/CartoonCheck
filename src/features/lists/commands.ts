import Dexie from 'dexie'
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
import {
  createListSchema,
  itemSchema,
  listSchema,
  updateListSchema,
} from '../../db/models'
import type {
  CreateListInput,
  ShoppingList,
  UpdateListInput,
} from '../../db/models'
import { requireList, requireProfile, touchList } from '../../db/records'
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

/**
 * Starts a list over for the next trip: every purchased item goes back to
 * pending and loses the price paid last time. Planned prices, photos and the
 * order of the items stay. Returns how many items changed.
 */
export async function restartList(
  db: CartoonCheckDatabase,
  context: CommandContext,
  id: string,
  expectedRevision: number,
): Promise<number> {
  assertDatabaseReady(db)
  return db.transaction(
    'rw',
    [db.meta, db.lists, db.items, db.history],
    async () => {
      await assertDataset(db, context)
      const list = await requireList(db, id, true)
      assertRevision(list.revision, expectedRevision)
      const purchased = await db.items
        .where('[listId+status+purchasedAt]')
        .between(
          [id, 'purchased', Dexie.minKey],
          [id, 'purchased', Dexie.maxKey],
        )
        .toArray()
      if (purchased.length === 0) return 0
      let time = updatedTime(list.updatedAt)
      for (const item of purchased) time = Math.max(time, item.updatedAt + 1)
      await db.items.bulkPut(
        purchased.map((item) =>
          itemSchema.parse({
            ...item,
            status: 'pending',
            purchasedAt: null,
            paidPriceMinor: null,
            updatedAt: time,
            revision: item.revision + 1,
          }),
        ),
      )
      const restarted = await touchList(db, list, time)
      await appendHistory(db, 'list_restarted', restarted, time)
      return purchased.length
    },
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

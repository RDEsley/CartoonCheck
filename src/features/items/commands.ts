import type { CartoonCheckDatabase } from '../../db/database'
import { assertDatabaseReady, assertDataset, assertRevision, updatedTime } from '../../db/context'
import type { CommandContext } from '../../db/context'
import { DataError } from '../../db/errors'
import { appendHistory } from '../../db/history'
import { createItemSchema, imageAssetSchema, itemSchema, updateItemSchema } from '../../db/models'
import type { CreateItemInput, ImageAsset, ShoppingItem, ShoppingList, UpdateItemInput } from '../../db/models'
import { requireItem, requireList, touchList } from '../../db/records'
import { createId } from '../../lib/create-id'

export interface PurchaseResult {
  item: ShoppingItem
  changed: boolean
  listCompleted: boolean
  operationId: string | null
  previousPurchase: Pick<ShoppingItem, 'status' | 'purchasedAt'>
}

export interface DeletedItem {
  item: ShoppingItem
  photo: ImageAsset | null
  operationId: string
}

function assertPricingCurrency(
  list: ShoppingList,
  fields: Pick<CreateItemInput, 'plannedPriceMinor' | 'paidPriceMinor'>,
  expected: ShoppingList['currency'] | undefined,
): void {
  if ((typeof fields.plannedPriceMinor === 'number' || typeof fields.paidPriceMinor === 'number')
    && expected !== list.currency) {
    throw new DataError('CONFLICT', 'Review the list currency before saving prices.')
  }
}

export async function addItem(
  db: CartoonCheckDatabase,
  context: CommandContext,
  listId: string,
  input: CreateItemInput,
): Promise<ShoppingItem> {
  const { expectedCurrency, ...fields } = createItemSchema.parse(input)
  assertDatabaseReady(db)
  return db.transaction('rw', [db.meta, db.lists, db.items, db.history], async () => {
    await assertDataset(db, context)
    const list = await requireList(db, listId, true)
    assertPricingCurrency(list, fields, expectedCurrency)
    const time = updatedTime(list.updatedAt)
    const item = itemSchema.parse({
      ...fields, id: createId(), listId, status: 'pending', photoId: null,
      createdAt: time, updatedAt: time, purchasedAt: null, revision: 1,
    })
    await db.items.add(item)
    await touchList(db, list, time)
    await appendHistory(db, 'item_added', list, time, item)
    return item
  })
}

export async function updateItem(
  db: CartoonCheckDatabase,
  context: CommandContext,
  id: string,
  input: UpdateItemInput,
  expectedRevision: number,
  photo?: ImageAsset | null,
): Promise<ShoppingItem> {
  const { expectedCurrency, ...fields } = updateItemSchema.parse(input)
  const asset = photo === undefined || photo === null ? photo : imageAssetSchema.parse(photo)
  assertDatabaseReady(db)
  return db.transaction('rw', [db.meta, db.lists, db.items, db.assets], async () => {
    await assertDataset(db, context)
    const current = await requireItem(db, id)
    const list = await requireList(db, current.listId, true)
    assertRevision(current.revision, expectedRevision)
    assertPricingCurrency(list, fields, expectedCurrency)
    const time = updatedTime(current.updatedAt, list.updatedAt)
    const item = itemSchema.parse({
      ...current, ...fields, ...(asset === undefined ? {} : { photoId: asset?.id ?? null }), updatedAt: time, revision: current.revision + 1,
    })
    if (asset !== undefined) {
      if (asset !== null) await db.assets.add(asset)
      if (current.photoId !== null) await db.assets.delete(current.photoId)
    }
    await db.items.put(item)
    await touchList(db, list, time)
    return item
  })
}

export async function setPurchased(
  db: CartoonCheckDatabase,
  context: CommandContext,
  id: string,
  purchased: boolean,
): Promise<PurchaseResult> {
  assertDatabaseReady(db)
  return db.transaction('rw', [db.meta, db.lists, db.items, db.history], async () => {
    await assertDataset(db, context)
    const current = await requireItem(db, id)
    const list = await requireList(db, current.listId, true)
    const previousPurchase = { status: current.status, purchasedAt: current.purchasedAt }
    const status = purchased ? 'purchased' : 'pending'
    if (current.status === status) {
      return { item: current, changed: false, listCompleted: false,
        operationId: null, previousPurchase }
    }
    const time = updatedTime(current.updatedAt, list.updatedAt)
    const item = itemSchema.parse({
      ...current, status, purchasedAt: purchased ? time : null,
      updatedAt: time, revision: current.revision + 1,
    })
    await db.items.put(item)
    await touchList(db, list, time)
    const history = await appendHistory(db,
      purchased ? 'item_purchased' : 'item_purchase_undone', list, time, item)
    const listCompleted = purchased
      && await db.items.where('[listId+status+createdAt]')
        .between([list.id, 'pending', 0], [list.id, 'pending', Number.MAX_SAFE_INTEGER], true, true)
        .count() === 0
    if (listCompleted) await appendHistory(db, 'list_completed', list, time)
    return { item, changed: true, listCompleted, operationId: history.id, previousPurchase }
  })
}

export async function deleteItem(
  db: CartoonCheckDatabase,
  context: CommandContext,
  id: string,
): Promise<DeletedItem> {
  assertDatabaseReady(db)
  return db.transaction('rw', [db.meta, db.lists, db.items, db.assets, db.history], async () => {
    await assertDataset(db, context)
    const item = await requireItem(db, id)
    const list = await requireList(db, item.listId, true)
    const photo = item.photoId === null ? null : await db.assets.get(item.photoId) ?? null
    if (item.photoId !== null) await db.assets.delete(item.photoId)
    await db.items.delete(id)
    const time = updatedTime(item.updatedAt, list.updatedAt)
    await touchList(db, list, time)
    const history = await appendHistory(db, 'item_removed', list, time, item)
    return { item, photo, operationId: history.id }
  })
}

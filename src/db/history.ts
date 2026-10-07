import type { CartoonCheckDatabase } from './database'
import { historySchema } from './models'
import type { HistoryEntry, ShoppingItem, ShoppingList } from './models'
import { createId } from '../lib/create-id'

export async function appendHistory(
  db: CartoonCheckDatabase,
  action: HistoryEntry['action'],
  list: ShoppingList,
  occurredAt: number,
  item: ShoppingItem | null = null,
  id = createId(),
): Promise<HistoryEntry> {
  const entry = historySchema.parse({
    id,
    action,
    occurredAt,
    listId: list.id,
    listName: list.name,
    itemId: item?.id ?? null,
    itemName: item?.name ?? null,
  })
  await db.history.add(entry)
  return entry
}

export const DATABASE_NAME = 'cartoon-check'
export const DATABASE_VERSION = 1

export const storesV1 = {
  profile: 'id',
  lists: 'id, [status+updatedAt]',
  items: 'id, listId, [listId+status+createdAt], [listId+status+purchasedAt]',
  assets: 'id',
  history: 'id, occurredAt, [listId+occurredAt]',
  meta: 'key',
} as const

import { z } from 'zod'

export const currencies = ['BRL', 'JPY', 'USD', 'EUR'] as const
export const themes = ['comic-pop', 'sakura', 'night-cartoon'] as const
export const avatarPresets = ['bag', 'star', 'gift', 'leaf', 'planet'] as const

const id = z.uuid()
const timestamp = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
const revision = z.number().int().positive().max(Number.MAX_SAFE_INTEGER)
const name = z.string().min(1).max(120).refine((value) => value === value.trim())
const inputName = z.string().trim().min(1).max(120)
const price = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable()
const quantity = z.number().int().positive().max(Number.MAX_SAFE_INTEGER)
const emoji = z.string().trim().min(1).max(16).nullable()
const note = z.string().max(2000).nullable()
const store = z.string().trim().max(120).nullable()
const currency = z.enum(currencies)

const link = z.string().max(2048).refine((value) => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}, 'Only HTTP and HTTPS links are supported.').nullable()

const exchangeRate = z.string()
  .refine((value) => {
    if (!/^(?:0|[1-9]\d{0,6})(?:\.\d{0,7}[1-9])?$/.test(value)) return false
    const [, fraction = ''] = value.split('.')
    const numerator = BigInt(value.replace('.', ''))
    const denominator = 10n ** BigInt(fraction.length)
    return numerator > 0n && numerator <= 1_000_000n * denominator
  }, 'The exchange rate must be positive and at most 1000000.')
  .nullable()

const recordFields = { id, createdAt: timestamp, updatedAt: timestamp, revision }

function orderedTimestamps(record: { createdAt: number; updatedAt: number }) {
  return record.updatedAt >= record.createdAt
}

export const profileSchema = z.strictObject({
  ...recordFields,
  name: name.max(40),
  avatarPresetId: z.enum(avatarPresets).nullable(),
  photoId: id.nullable(),
  themeId: z.enum(themes),
  reduceMotion: z.boolean(),
  hapticsEnabled: z.boolean(),
}).refine(orderedTimestamps, 'Updated time must not precede creation.')
  .refine((profile) => (profile.avatarPresetId === null) !== (profile.photoId === null),
    'Choose either a preset avatar or a photo.')

export const listSchema = z.strictObject({
  ...recordFields,
  name,
  emoji,
  status: z.enum(['active', 'archived']),
  currency,
  secondaryCurrency: currency.nullable(),
  manualExchangeRate: exchangeRate,
}).refine(orderedTimestamps, 'Updated time must not precede creation.')
  .refine((list) => (list.secondaryCurrency === null) === (list.manualExchangeRate === null),
    'Secondary currency and exchange rate must be configured together.')
  .refine((list) => list.currency !== list.secondaryCurrency,
    'Secondary currency must differ from the main currency.')

export const itemSchema = z.strictObject({
  ...recordFields,
  listId: id,
  name,
  status: z.enum(['pending', 'purchased']),
  quantity,
  plannedPriceMinor: price,
  paidPriceMinor: price,
  photoId: id.nullable(),
  note,
  store,
  link,
  purchasedAt: timestamp.nullable(),
}).refine(orderedTimestamps, 'Updated time must not precede creation.')
  .refine((item) => item.status === 'pending'
    ? item.purchasedAt === null
    : item.purchasedAt !== null
      && item.purchasedAt >= item.createdAt
      && item.purchasedAt <= item.updatedAt,
  'Purchase status and timestamp must agree.')

export const imageAssetSchema = z.strictObject({
  id,
  blob: z.instanceof(Blob),
  mime: z.enum(['image/webp', 'image/jpeg']),
  width: z.number().int().min(1).max(1280),
  height: z.number().int().min(1).max(1280),
  byteLength: z.number().int().min(1).max(512 * 1024),
  createdAt: timestamp,
}).refine((asset) => asset.blob.size === asset.byteLength && asset.blob.type === asset.mime,
  'Image metadata must match the stored Blob.')

export const historyActions = [
  'list_created', 'list_archived', 'list_reactivated', 'list_deleted', 'list_completed',
  'item_added', 'item_purchased', 'item_purchase_undone', 'item_removed', 'item_restored',
] as const

export const historySchema = z.strictObject({
  id,
  action: z.enum(historyActions),
  occurredAt: timestamp,
  listId: id,
  listName: name,
  itemId: id.nullable(),
  itemName: name.nullable(),
}).refine((entry) => entry.action.startsWith('item_')
  ? entry.itemId !== null && entry.itemName !== null
  : entry.itemId === null && entry.itemName === null,
'History snapshots must match the action type.')

export const metaSchema = z.strictObject({
  key: z.literal('app'),
  datasetEpoch: id,
})

export const createProfileSchema = z.strictObject({
  name: inputName.max(40),
  avatarPresetId: z.enum(avatarPresets).default('bag'),
  themeId: z.enum(themes).default('comic-pop'),
  reduceMotion: z.boolean().default(false),
  hapticsEnabled: z.boolean().default(true),
})

export const updateProfileSchema = z.strictObject({
  name: inputName.max(40),
  avatarPresetId: z.enum(avatarPresets),
  themeId: z.enum(themes),
  reduceMotion: z.boolean(),
  hapticsEnabled: z.boolean(),
}).partial()
  .refine((input) => Object.keys(input).length > 0, 'Provide at least one change.')

export const createListSchema = z.strictObject({
  name: inputName,
  emoji: emoji.default(null),
  currency: currency.default('BRL'),
  secondaryCurrency: currency.nullable().default(null),
  manualExchangeRate: exchangeRate.default(null),
})

export const updateListSchema = z.strictObject({
  name: inputName,
  emoji,
  currency,
  secondaryCurrency: currency.nullable(),
  manualExchangeRate: exchangeRate,
}).partial()
  .refine((input) => Object.keys(input).length > 0, 'Provide at least one change.')

export const createItemSchema = z.strictObject({
  name: inputName,
  expectedCurrency: currency.optional(),
  quantity: quantity.default(1),
  plannedPriceMinor: price.default(null),
  paidPriceMinor: price.default(null),
  note: note.default(null),
  store: store.default(null),
  link: link.default(null),
})

export const updateItemSchema = z.strictObject({
  name: inputName,
  expectedCurrency: currency.optional(),
  quantity,
  plannedPriceMinor: price,
  paidPriceMinor: price,
  note,
  store,
  link,
}).partial()
  .refine((input) => Object.keys(input).some((key) => key !== 'expectedCurrency'),
    'Provide at least one change.')

export type Profile = z.infer<typeof profileSchema>
export type ShoppingList = z.infer<typeof listSchema>
export type ShoppingItem = z.infer<typeof itemSchema>
export type ImageAsset = z.infer<typeof imageAssetSchema>
export type HistoryEntry = z.infer<typeof historySchema>
export type AppMeta = z.infer<typeof metaSchema>
export type CreateProfileInput = z.input<typeof createProfileSchema>
export type UpdateProfileInput = z.input<typeof updateProfileSchema>
export type CreateListInput = z.input<typeof createListSchema>
export type UpdateListInput = z.input<typeof updateListSchema>
export type CreateItemInput = z.input<typeof createItemSchema>
export type UpdateItemInput = z.input<typeof updateItemSchema>

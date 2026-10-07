// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { createId } from '../lib/create-id'
import {
  createItemSchema,
  createProfileSchema,
  historySchema,
  imageAssetSchema,
  itemSchema,
  listSchema,
  profileSchema,
  updateItemSchema,
  updateListSchema,
  updateProfileSchema,
} from './models'

const record = { id: createId(), createdAt: 100, updatedAt: 100, revision: 1 }
const list = {
  ...record,
  name: 'Japão',
  emoji: '🇯🇵',
  status: 'active',
  currency: 'JPY',
  secondaryCurrency: null,
  manualExchangeRate: null,
}
const item = {
  ...record,
  listId: createId(),
  name: 'Nintendo Switch 2',
  status: 'pending',
  quantity: 1,
  plannedPriceMinor: null,
  paidPriceMinor: null,
  photoId: null,
  note: null,
  store: null,
  link: null,
  purchasedAt: null,
}

describe('data contracts', () => {
  it('does not apply creation defaults to partial edits', () => {
    expect(updateItemSchema.parse({ name: '  Mochila  ' })).toEqual({
      name: 'Mochila',
    })
    expect(updateListSchema.parse({ name: 'Japão' })).toEqual({ name: 'Japão' })
    expect(updateProfileSchema.parse({ name: 'Richard' })).toEqual({
      name: 'Richard',
    })
  })
  it('normalizes quick entry without requiring optional fields', () => {
    expect(
      createItemSchema.parse({ name: '  Nintendo Switch 2  ' }),
    ).toMatchObject({
      name: 'Nintendo Switch 2',
      quantity: 1,
      plannedPriceMinor: null,
      note: null,
    })
    expect(createProfileSchema.parse({ name: ' Richard ' })).toMatchObject({
      name: 'Richard',
      themeId: 'comic-pop',
      avatarPresetId: 'bag',
    })
  })

  it('rejects empty names, unsupported fields and unsafe links', () => {
    expect(createItemSchema.safeParse({ name: '  ' }).success).toBe(false)
    expect(
      createProfileSchema.safeParse({ name: 'Richard', password: 'secret' })
        .success,
    ).toBe(false)
    expect(
      createItemSchema.safeParse({
        name: 'Presente',
        link: 'javascript:alert(1)',
      }).success,
    ).toBe(false)
    expect(
      createItemSchema.safeParse({
        name: 'Presente',
        link: 'https://example.com',
      }).success,
    ).toBe(true)
  })

  it('preserves zero prices independently from missing prices and quantity', () => {
    expect(
      itemSchema.parse({
        ...item,
        quantity: 3,
        plannedPriceMinor: 10000,
        paidPriceMinor: 0,
      }),
    ).toMatchObject({
      plannedPriceMinor: 10000,
      paidPriceMinor: 0,
      quantity: 3,
    })
    expect(itemSchema.parse(item).paidPriceMinor).toBeNull()
  })

  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1, Infinity])(
    'rejects invalid price %s',
    (value) => {
      expect(
        itemSchema.safeParse({ ...item, plannedPriceMinor: value }).success,
      ).toBe(false)
    },
  )

  it('requires purchase state and timestamps to agree', () => {
    expect(itemSchema.safeParse({ ...item, purchasedAt: 100 }).success).toBe(
      false,
    )
    expect(itemSchema.safeParse({ ...item, status: 'purchased' }).success).toBe(
      false,
    )
    expect(
      itemSchema.safeParse({ ...item, status: 'purchased', purchasedAt: 99 })
        .success,
    ).toBe(false)
    expect(
      itemSchema.safeParse({ ...item, status: 'purchased', purchasedAt: 101 })
        .success,
    ).toBe(false)
    expect(
      itemSchema.safeParse({ ...item, status: 'purchased', purchasedAt: 100 })
        .success,
    ).toBe(true)
  })

  it('requires positive revisions and ordered record timestamps', () => {
    expect(listSchema.safeParse({ ...list, revision: 0 }).success).toBe(false)
    expect(listSchema.safeParse({ ...list, updatedAt: 99 }).success).toBe(false)
    expect(itemSchema.safeParse({ ...item, quantity: 0 }).success).toBe(false)
  })

  it('validates paired currency settings and canonical exchange rates', () => {
    expect(
      listSchema.safeParse({
        ...list,
        secondaryCurrency: 'BRL',
        manualExchangeRate: '0.035',
      }).success,
    ).toBe(true)
    for (const rate of [
      '0',
      '-1',
      '0,035',
      '0.0350',
      '1e2',
      '1000000.1',
      '0.123456789',
    ]) {
      expect(
        listSchema.safeParse({
          ...list,
          secondaryCurrency: 'BRL',
          manualExchangeRate: rate,
        }).success,
      ).toBe(false)
    }
    expect(
      listSchema.safeParse({ ...list, secondaryCurrency: 'BRL' }).success,
    ).toBe(false)
    expect(
      listSchema.safeParse({
        ...list,
        secondaryCurrency: 'JPY',
        manualExchangeRate: '1',
      }).success,
    ).toBe(false)
  })

  it('requires exactly one avatar source', () => {
    const profile = {
      ...record,
      name: 'Richard',
      avatarPresetId: 'bag',
      photoId: null,
      themeId: 'comic-pop',
      reduceMotion: false,
      hapticsEnabled: true,
    }
    expect(profileSchema.safeParse(profile).success).toBe(true)
    expect(
      profileSchema.safeParse({ ...profile, avatarPresetId: null }).success,
    ).toBe(false)
    expect(
      profileSchema.safeParse({ ...profile, photoId: createId() }).success,
    ).toBe(false)
  })

  it('validates image metadata without indexing or encoding the Blob', () => {
    const blob = new Blob(['image'], { type: 'image/webp' })
    const asset = {
      id: createId(),
      blob,
      mime: 'image/webp',
      width: 100,
      height: 100,
      byteLength: blob.size,
      createdAt: 100,
    }
    expect(imageAssetSchema.safeParse(asset).success).toBe(true)
    expect(
      imageAssetSchema.safeParse({ ...asset, byteLength: blob.size + 1 })
        .success,
    ).toBe(false)
    expect(imageAssetSchema.safeParse({ ...asset, width: 1281 }).success).toBe(
      false,
    )
  })

  it('requires appropriate historical snapshots', () => {
    const entry = {
      id: createId(),
      action: 'item_added',
      occurredAt: 100,
      listId: list.id,
      listName: list.name,
      itemId: item.id,
      itemName: item.name,
    }
    expect(historySchema.safeParse(entry).success).toBe(true)
    expect(historySchema.safeParse({ ...entry, itemName: null }).success).toBe(
      false,
    )
    expect(
      historySchema.safeParse({ ...entry, action: 'list_completed' }).success,
    ).toBe(false)
  })
})

describe('UUID generation', () => {
  it('generates unique valid UUIDs without sequential identifiers', () => {
    const first = createId()
    expect(first).toMatch(
      /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/,
    )
    expect(createId()).not.toBe(first)
  })

  it('uses secure random bytes when randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: crypto.getRandomValues.bind(crypto),
    })
    expect(createId()).toMatch(
      /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/,
    )
  })

  it('fails explicitly when secure randomness is unavailable', () => {
    vi.stubGlobal('crypto', undefined)
    expect(createId).toThrow('Secure random generation is unavailable.')
  })
})

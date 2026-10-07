import { beforeEach, expect, it, vi } from 'vitest'
import { createId } from '../lib/create-id'
beforeEach(() => {
  sessionStorage.clear()
  vi.resetModules()
})
it('recovers only drafts that match the scope, dataset and record revision', async () => {
  const { checkpointDraft, initialDraftField } = await import('./drafts')
  const epoch = createId()
  checkpointDraft({
    version: 1,
    scope: 'item:camera',
    epoch,
    revision: 4,
    route: '/app',
    fields: { name: 'Camera', note: 'Blue' },
  })
  expect(initialDraftField('item:camera', epoch, 4, 'name', '')).toBe('Camera')
  expect(initialDraftField('item:camera', epoch, 5, 'name', 'Current')).toBe(
    'Current',
  )
  expect(
    initialDraftField('item:camera', createId(), 4, 'name', 'Current'),
  ).toBe('Current')
  expect(initialDraftField('item:other', epoch, 4, 'name', 'Other')).toBe(
    'Other',
  )
})
it('retains a draft in memory and blocks updates when session storage is full', async () => {
  const { checkpointDraft, draftIsSafe, getDraftSnapshot } =
    await import('./drafts')
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('full', 'QuotaExceededError')
  })
  checkpointDraft({
    version: 1,
    scope: 'add:list',
    epoch: createId(),
    revision: 0,
    route: '/app',
    fields: { name: 'Unsaved Switch' },
  })
  expect(draftIsSafe()).toBe(false)
  expect(getDraftSnapshot().draft?.fields.name).toBe('Unsaved Switch')
})
it('keeps the form working and blocks updates when a field is too large to checkpoint', async () => {
  const { checkpointDraft, draftIsSafe } = await import('./drafts')
  const draft = {
    version: 1 as const,
    scope: 'item:camera',
    epoch: createId(),
    revision: 1,
    route: '/app',
    fields: { planned: '9'.repeat(5000) },
  }
  expect(() => {
    checkpointDraft(draft)
  }).not.toThrow()
  expect(draftIsSafe()).toBe(false)
  checkpointDraft({ ...draft, fields: { planned: '10' } })
  expect(draftIsSafe()).toBe(true)
})

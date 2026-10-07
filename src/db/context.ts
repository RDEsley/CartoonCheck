import type { CartoonCheckDatabase } from './database'
import { DataError } from './errors'
import { metaSchema } from './models'

export interface CommandContext {
  datasetEpoch: string
}

export function assertDatabaseReady(db: CartoonCheckDatabase): void {
  if (db.state !== 'ready' || !db.isOpen()) {
    throw new DataError(
      'DATABASE_UNAVAILABLE',
      'The database connection is unavailable.',
    )
  }
}

export async function getCommandContext(
  db: CartoonCheckDatabase,
): Promise<CommandContext> {
  assertDatabaseReady(db)
  const row = await db.meta.get('app')
  if (!row)
    throw new DataError('INVALID_DATABASE', 'Database metadata is missing.')
  return { datasetEpoch: metaSchema.parse(row).datasetEpoch }
}

export async function assertDataset(
  db: CartoonCheckDatabase,
  context: CommandContext,
): Promise<void> {
  const current = await getCommandContext(db)
  if (current.datasetEpoch !== context.datasetEpoch) {
    throw new DataError(
      'STALE_DATASET',
      'The data was replaced. Reload before making changes.',
    )
  }
}

export function assertRevision(current: number, expected: number): void {
  if (current !== expected) {
    throw new DataError(
      'CONFLICT',
      'The record changed. Review the latest data before saving.',
    )
  }
}

/**
 * The time of a change, always after the given previous ones. Order by time
 * stays stable when two changes share a millisecond or the clock steps back.
 */
export function updatedTime(...previousTimes: number[]): number {
  return Math.max(Date.now(), ...previousTimes.map((time) => time + 1))
}

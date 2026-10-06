import Dexie from 'dexie'
import type { Table } from 'dexie'
import { createId } from '../lib/create-id'
import { DataError } from './errors'
import { metaSchema } from './models'
import type { AppMeta, HistoryEntry, ImageAsset, Profile, ShoppingItem, ShoppingList } from './models'
import { DATABASE_NAME, DATABASE_VERSION, storesV1 } from './schema'

export type DatabaseState = 'closed' | 'opening' | 'ready' | 'blocked' | 'outdated' | 'error'

export class CartoonCheckDatabase extends Dexie {
  readonly profile: Table<Profile, string>
  readonly lists: Table<ShoppingList, string>
  readonly items: Table<ShoppingItem, string>
  readonly assets: Table<ImageAsset, string>
  readonly history: Table<HistoryEntry, string>
  readonly meta: Table<AppMeta, string>
  private currentState: DatabaseState = 'closed'

  constructor(
    name = DATABASE_NAME,
    private readonly onStateChange?: (state: DatabaseState) => void,
  ) {
    super(name, { autoOpen: false })
    this.version(DATABASE_VERSION).stores(storesV1)
    this.profile = this.table('profile')
    this.lists = this.table('lists')
    this.items = this.table('items')
    this.assets = this.table('assets')
    this.history = this.table('history')
    this.meta = this.table('meta')

    this.on('populate', (transaction) => transaction.table<AppMeta, string>('meta').add(
      metaSchema.parse({ key: 'app', datasetEpoch: createId() }),
    ))
    this.on('versionchange', () => {
      this.close()
      this.setState('outdated')
      return false
    })
    this.on('blocked', () => { this.setState('blocked') })
  }

  get state(): DatabaseState {
    return this.currentState
  }

  async initialize(): Promise<void> {
    if (this.state === 'outdated') {
      throw new DataError('DATABASE_UNAVAILABLE', 'Reload before opening an outdated connection.')
    }
    if (this.isOpen()) return

    this.setState('opening')
    try {
      await this.assertSupportedVersion()
      await this.open()
      // Dexie maps decimal schema versions to native versions multiplied by ten.
      if (this.backendDB().version / 10 > DATABASE_VERSION) {
        throw new Dexie.VersionError('This database requires a newer application version.')
      }
      this.setState('ready')
    } catch (error) {
      this.close()
      this.setState(error instanceof Dexie.VersionError ? 'outdated' : 'error')
      throw error
    }
  }

  override close(): void {
    super.close()
    this.setState('closed')
  }

  private setState(state: DatabaseState): void {
    this.currentState = state
    this.onStateChange?.(state)
  }

  private async assertSupportedVersion(): Promise<void> {
    const probe = new Dexie(this.name, { autoOpen: false })
    try {
      await probe.open()
      if (probe.verno > DATABASE_VERSION) {
        throw new Dexie.VersionError('This database requires a newer application version.')
      }
    } catch (error) {
      if (!(error instanceof Dexie.NoSuchDatabaseError)) throw error
    } finally {
      probe.close()
    }
  }
}

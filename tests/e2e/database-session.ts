import type { Page } from '@playwright/test'
import type { CartoonCheckDatabase } from '../../src/db/database'
import type { CommandContext } from '../../src/db/context'

interface BrowserDatabaseSession {
  db: CartoonCheckDatabase
  context: CommandContext
  profile: typeof import('../../src/features/profile/commands')
  lists: typeof import('../../src/features/lists/commands')
  items: typeof import('../../src/features/items/commands')
  listQueries: typeof import('../../src/features/lists/queries')
  itemQueries: typeof import('../../src/features/items/queries')
}

declare global {
  interface Window {
    cartoonCheckTestSession: BrowserDatabaseSession
  }
}

export async function connectDatabase(page: Page, name: string) {
  await page.goto('/')
  await page.evaluate(async (databaseName) => {
    const paths = {
      db: '/src/db/database.ts',
      context: '/src/db/context.ts',
      profile: '/src/features/profile/commands.ts',
      lists: '/src/features/lists/commands.ts',
      items: '/src/features/items/commands.ts',
      listQueries: '/src/features/lists/queries.ts',
      itemQueries: '/src/features/items/queries.ts',
    }
    const databaseModule = await import(paths.db) as typeof import('../../src/db/database')
    const contextModule = await import(paths.context) as typeof import('../../src/db/context')
    const db = new databaseModule.CartoonCheckDatabase(databaseName)
    await db.initialize()
    window.cartoonCheckTestSession = {
      db,
      context: await contextModule.getCommandContext(db),
      profile: await import(paths.profile) as BrowserDatabaseSession['profile'],
      lists: await import(paths.lists) as BrowserDatabaseSession['lists'],
      items: await import(paths.items) as BrowserDatabaseSession['items'],
      listQueries: await import(paths.listQueries) as BrowserDatabaseSession['listQueries'],
      itemQueries: await import(paths.itemQueries) as BrowserDatabaseSession['itemQueries'],
    }
  }, name)
}

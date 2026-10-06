# Cartoon Check

**Add. Check. Celebrate.**

A shopping list app in development, designed around quick entry and satisfying
cartoon interactions. The interface is in Brazilian Portuguese.

## Status

The foundation and data layer are ready: strict TypeScript, IndexedDB schema,
validated profile/list/item commands, indexed queries and transactional history.

The interface is still the initial shell. Shopping screens, animated checkboxes,
themes, backup and offline installation are not available yet.

## Stack

- React 19 and TypeScript 6 with strict checking
- Vite 8 and CSS Modules
- ESLint with type-aware TypeScript and React rules
- Vitest, React Testing Library and jsdom
- Dexie for IndexedDB and Zod for data validation
- GitHub Actions

Dependencies are pinned and the lockfile is committed. The TypeScript version
matches the supported range of the lint tooling.

## Getting started

Use Node.js **24.18.1** and npm **11 or newer**.

```sh
git clone https://github.com/RDEsley/CartoonCheck.git
cd CartoonCheck
nvm install 24.18.1
nvm use 24.18.1
npm ci
npm run dev
```

Open the local URL printed by Vite. On Windows PowerShell, use `npm.cmd` if
execution policy blocks `npm.ps1`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run lint` | Run type-aware linting with no warnings allowed |
| `npm run typecheck` | Check application and tooling types |
| `npm test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run build` | Typecheck and create a production build in `dist/` |
| `npm run preview` | Preview the production build locally |

## Project structure

```text
src/
  app/          Application entry and initial shell
  db/           Data contracts, schema and connection lifecycle
  features/     Profile, list, item and history services
  lib/          Shared utilities
  styles/       Global styles
  main.tsx      React bootstrap
tests/
  integration/  IndexedDB integration tests
  setup.ts      DOM matchers and test cleanup
  vitest.d.ts   Typed DOM assertions for Vitest
```

## Local-first data layer

IndexedDB is the source of truth, accessed through Dexie. The database starts at
schema version 1, with UUID keys and separate stores for profile, lists, items,
images, history and dataset metadata. Counts and progress are derived from items.

Commands validate input with Zod and commit related writes in one transaction.
A failed history write rolls back the associated action. Purchasing an already
purchased item is a no-op, and only buying the last pending item records a list
completion. Deleting the last pending item does not count as completion.

Edits use revisions to reject obsolete forms. Commands also check the dataset
identity, preventing an old session from writing to replaced data. A database
newer than the application is rejected without deletion or downgrade.

Prices are optional totals per item, stored as integer minor units. Price writes
carry their expected currency, and changing a list currency is blocked while
prices exist. Quantity does not multiply the price.

## Testing and checks

Vitest covers validation, UUID generation, database lifecycle, profile/list/item
commands, persistence, history, concurrency and rollback. Integration tests use
fake-indexeddb in Node; the DOM environment is ready for component tests.

CI runs lint, tests, typechecking and the production build. Application, tooling
and test code are checked with strict TypeScript settings. An empty test suite
fails the checks.

To validate the current implementation:

```sh
npm run lint
npm run test:run
npm run typecheck
npm run build
```

## License

[MIT](LICENSE) — Copyright 2026 Richard Oliveira.

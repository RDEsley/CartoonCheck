# Cartoon Check

**Add. Check. Celebrate.**

A shopping list app in development, designed around quick entry and satisfying
cartoon interactions. The interface is in Brazilian Portuguese.

## Status

The project foundation and initial data contracts are ready: React, strict
TypeScript, Vite, IndexedDB schema, validation and continuous integration.

Shopping lists, IndexedDB persistence, animated checkboxes, themes, backup and
offline installation are planned. These features are not available yet.

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
  lib/          Shared utilities
  styles/       Global styles
  main.tsx      React bootstrap
tests/
  integration/  IndexedDB integration tests
  setup.ts      DOM matchers and test cleanup
  vitest.d.ts   Typed DOM assertions for Vitest
```

Feature modules will be added as their behavior is implemented.

## Testing and checks

Vitest covers data validation, UUID generation, IndexedDB initialization and
connection compatibility. Database integration tests use fake-indexeddb in a
Node environment; the DOM environment is ready for component tests.

CI runs lint, tests, typechecking and the production build. Application, tooling
and test code are checked with strict TypeScript settings. An empty test suite
fails the checks.

To validate the current foundation:

```sh
npm run lint
npm run test:run
npm run typecheck
npm run build
```

## License

[MIT](LICENSE) — Copyright 2026 Richard Oliveira.

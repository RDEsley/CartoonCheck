# Cartoon Check

**Add. Check. Celebrate.**

A shopping list app in development, designed around quick entry and satisfying
cartoon interactions. The interface is in Brazilian Portuguese.

## Status

The project foundation is ready: React, strict TypeScript, Vite, linting, test
tooling and continuous integration.

Shopping lists, IndexedDB persistence, animated checkboxes, themes, backup and
offline installation are planned. These features are not available yet.

## Stack

- React 19 and TypeScript 6 with strict checking
- Vite 8 and CSS Modules
- ESLint with type-aware TypeScript and React rules
- Vitest, React Testing Library and jsdom
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
  styles/       Global styles
  main.tsx      React bootstrap
tests/
  setup.ts      DOM matchers and test cleanup
  vitest.d.ts   Typed DOM assertions for Vitest
```

Feature modules will be added as their behavior is implemented.

## Testing and checks

There are no product tests at this milestone. The test runner is configured for
DOM tests, with explicit cleanup and reset of mocks between tests.

CI runs lint, tests, typechecking and the production build. It temporarily allows
an empty test suite during the foundation milestone. Once domain behavior is
introduced, that exception will be removed.

To validate the current foundation:

```sh
npm run lint
npm run test:run -- --passWithNoTests
npm run typecheck
npm run build
```

## License

[MIT](LICENSE) — Copyright 2026 Richard Oliveira.

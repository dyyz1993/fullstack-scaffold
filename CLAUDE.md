# CLAUDE.md

This file provides guidance to AI coding agents (Claude Code / ZCode / Codex) working in this repository.

## Project

**`create-fullstack-scaffold`** — a zero-config fullstack app **generator** published to npm. Users run `npx create-fullstack-scaffold@latest my-app --preset <preset>`; the CLI scaffolds a React + Hono app from `template/` with preset-driven module selection.

This is NOT a Todo application. The root `src/` is the **CLI and generators**; the shippable app lives in `template/` (workspace `biomimic-todo-app`).

## Repository Layout

- `src/` — CLI (`commands/create.ts`), code-emitting **generators** (`src/generators/`), CLI unit/e2e tests
- `template/` — the app template shipped to users (its own vitest/eslint/playwright suites)
- `template/src/server/module-*/` — feature modules declared via `module.ts` manifests
- `lint-scripts/` — 17 custom validators (`npm run validate:all`)
- `eslint-rules/` — ~34 custom ESLint rules (mirrored in `template/eslint-rules/`)
- `.zcode/` — workspace agent hooks (mirrored in `template/.zcode/`; `npm run hooks:sync -- --global` installs to ZCode/Codex globals)
- `patches/` — hono/zod patches (**TypeScript compiler patches are forbidden** — validator `no-ts-patch`)

## Key Commands

```bash
npm run build:cli        # build the scaffold CLI (dist/cli)
node dist/cli/index.js my-app --preset todo-app   # scaffold locally
npm run validate:all     # 17 validators (incl. No TS Patch, Agent Hooks Sync)
npm run framework:check  # framework-file modification ledger
npm run test:all         # affected tests via smart-test graph
cd template && npx vitest run && npx tsc --noEmit   # template suite
```

## Architecture Essentials

### RPC type safety (TS2589 discipline)

Merged mega-types (`typeof chainedRouteRegistry`, `ReturnType<typeof createApp>`) are **banned** (ESLint `no-merged-api-type-export`). Each module exports a narrow `XxxApiType`; clients instantiate per-module `hc<T>` via generated `src/server/rpc-surface.ts`. Regression tripwires: `template/src/server/rpc-type-canary.ts`, CI tsc budget (120s), validator `no-ts-patch`.

### Generated files (do not hand-edit in scaffolded apps)

`rpc-surface.ts`, `isr-modules.ts`, `client/stores/entry-stores.ts`, `route-registry.ts`, `app.ts`, shared-schema barrels — all emitted by `src/generators/` based on preset manifests. The template keeps full versions; the CLI overwrites per preset.

### Module system

`module.ts` manifests declare routes/schemas/pages/stores/deps. Presets resolve `dependsOn` transitively; excluded modules' files are filtered from the copy. Validation: `npm run validate:modules`.

### Framework layer

Files under `server/core`, `server/entries`, `server/test-utils`, `client/services`, `eslint-rules/` carry `@framework-baseline <hash>` headers; modifications need `@framework-modify/@reason/@impact` annotations or `framework:check` blocks the commit.

### Testing layers

CLI unit + scaffold-verify (root vitest) → template unit (1893 tests) → template integration → Playwright E2E (3 browsers, dev server via `tests/e2e/global-setup.ts` which also runs `drizzle-kit push`) → 7-preset build matrix → Generated App Constraint Verify (scaffold → tsc → banned-pattern lint).

## Conventions

- Commits: commitlint conventional types only (`feat|fix|docs|style|refactor|test|chore|revert`), lowercase subject start (no `ISR:`-style caps)
- `--no-verify` commits are forbidden (agent hooks `no-no-verify.mjs` enforce this for ZCode/Codex)
- Generator changes must be verified with `tsc --noEmit` inside a freshly scaffolded app (vitest transpile does NOT type-check)
- Shared zod schemas live in `src/shared/modules/<name>/`, re-exported via generated barrels

# Improvement Backlog

## P1 — Should fix soon

### [ARCH-1] Regex-based manifest parser is fragile

**File:** `src/generators/template-generator.ts`
**Issue:** Uses regex to parse TypeScript module manifests. Fragile — comments, formatting changes, or complex expressions break it silently.
**Fix:** Use ts-morph or @babel/parser for AST-based parsing, or evaluate modules via tsx dynamic import.
**Effort:** 3-5 days

### [ARCH-2] Generator regex replacements are fragile

**Files:** `src/generators/server-app.ts`, `src/generators/db-init.ts`
**Issue:** Read original file + regex replace approach breaks when original file format changes.
**Fix:** Generate these files from scratch using template strings (like client-app.ts already does).
**Effort:** 2-3 days

### [TEST-1] No E2E tests for non-fullstack presets

**Issue:** Playwright E2E tests only cover fullstack-admin. No runtime verification for minimal/todo-app presets.
**Fix:** Add E2E scaffold-and-verify tests for each preset.
**Effort:** 2-3 days

## P2 — Plan to optimize

### [ARCH-3] Adding new module requires 10+ touch points

**Issue:** Must update module.ts, route-registry, file-filter (4 places), shared-modules-index, shared-schemas-index, package-json, modules.config, app.ts, CLAUDE.md.
**Fix:** Drive all filtering from manifest data. Generators should read manifest instead of maintaining parallel hardcoded lists.
**Effort:** 5-7 days

### [ARCH-4] Manifest data could drift from actual code

**Issue:** validate:modules checks file existence but not export names, import paths, or schema consistency.
**Fix:** Add drift-check that verifies exports match declarations.
**Effort:** 1-2 days

### [UX-1] No interactive preset selection

**Issue:** Silent default to fullstack-admin. Users must know --preset flag.
**Fix:** Add interactive picker (inquirer/prompts) when no preset specified.
**Effort:** 1-2 days

### [UX-2] Template CLAUDE.md/README not generated per preset

**Issue:** Scaffolded project docs reference modules that don't exist in non-fullstack presets.
**Fix:** Generate per-preset CLAUDE.md and README content.
**Effort:** 1-2 days

### [CI-1] No CI build test for non-fullstack presets

**Issue:** CI only verifies fullstack-admin preset builds.
**Fix:** Add matrix CI job scaffolding each preset → install → build.
**Effort:** 1 day

### [CI-2] Redundant CLI test files

**Issue:** cli.test.ts, cli-scaffold.test.ts, create-command.test.ts overlap significantly.
**Fix:** Consolidate into one comprehensive test file.
**Effort:** 1 day

## P3 — Nice to have

### [PERF-1] Root package.json has template dependencies

**Issue:** Root CLI tool's package.json includes all template deps (hono, drizzle, react, etc.) even though CLI only needs chalk/commander/ora/fs-extra.
**Fix:** Properly separate root and template dependencies.
**Effort:** 1-2 days

### [DOC-1] No CHANGELOG.md

**Fix:** Add initial CHANGELOG.md.
**Effort:** 1 hour

### [DOC-2] CONTRIBUTING.md module steps need generators mention

**Status:** Done ✅

### [DOC-3] Banner should mention Hono

**Status:** Done ✅

### [DOC-4] README should explain presets

**Status:** Done ✅

### [SEC-1] Remove unused deps from template

**Status:** Done ✅ (lodash-es, chalk, mysql2 removed)

## Completed

### ✅ [BUG-1] vite.config.ts not regenerated for non-admin presets

**Fixed:** Created vite-config.ts generator, strips admin.html entry for non-admin presets.

### ✅ Module manifest system (Phase 1)

11 module.ts manifests, validator, presets config.

### ✅ Multi-template generators (Phase 2)

15+ generators, CLI --preset support, dependency filtering.

### ✅ Package rename

create-biomimic-app → create-fullstack-scaffold

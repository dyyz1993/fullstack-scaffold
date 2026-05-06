---
description: "Module manifest system and multi-template architecture guide"
globs:
  [
    "template/src/server/module-*/*.ts",
    "src/generators/*.ts",
    "template/modules.config.ts",
  ]
---

# Module System & Multi-Template Architecture

## Overview

The project uses a declarative module manifest system. Each module declares its routes, dependencies, pages, DB schemas, and middleware in a `module.ts` file. The CLI reads these manifests to generate template variants.

## Module Manifest (`module.ts`)

Located at `template/src/server/module-{name}/module.ts`. Must export a default `ModuleManifest` object.

### Key Fields

- `name` — unique identifier
- `category` — 'core' | 'communication' | 'business' | 'system'
- `dependsOn` — other module names this module requires
- `routes.client` — routes mounted under /api (client-facing)
- `routes.admin[]` — routes mounted under /api (admin-facing)
- `routes.standalone` — routes with custom mount path
- `clientPages[]` — React pages for the client SPA
- `adminPages[]` — React pages for the admin SPA
- `dbSchemas.files[]` — Drizzle table definitions in db/schema/
- `providesMiddleware[]` — middleware this module contributes
- `hasSSE` / `hasWebSocket` — realtime capabilities

## Template Presets (`modules.config.ts`)

Defines which modules each scaffold template includes:

- `fullstack-admin` — all 11 modules (default)
- `todo-app` — todos + chat + notifications
- `minimal` — todos only

## Adding a New Module

1. Create `template/src/server/module-xxx/` with routes, services, tests
2. Create `module.ts` manifest declaring capabilities
3. Create shared schemas in `template/src/shared/modules/xxx/`
4. Create DB schemas in `template/src/server/db/schema/`
5. Run `cd template && npm run validate:modules` to verify

## Adding a New Preset

1. Add entry to `TEMPLATE_PRESETS` in `template/modules.config.ts`
2. List modules in dependency-safe order
3. Test: `npx tsx src/index.ts test-project /tmp/test --preset your-preset`

## Code Generators (`src/generators/`)

When adding a new module, you may need to update generators:

- `template-generator.ts` — core manifest parsing
- `file-filter.ts` — include/exclude patterns
- `package-json.ts` — dependency filtering

## Validation

- `npm run validate:modules` — validates all manifests
- CI includes a `template-modules` job that runs this check

## Module Dependency Graph

```
todos ──── (standalone)
chat ──── (standalone)
notifications ── (standalone)
file ──── (standalone)
captcha ── (standalone)
permission ── (standalone, foundational)
admin ──→ permission + notifications
order ──→ permission
ticket ──→ permission
dispute ──→ permission
content ──→ permission
```

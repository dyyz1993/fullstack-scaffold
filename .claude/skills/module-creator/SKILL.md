---
name: module-creator
description: >
  Create new modules for the create-biomimic-app subtraction-mode project generator.
  Generates all layers: DB schema, shared schemas, server routes/services, client/admin pages,
  module manifest, and updates generators automatically.
  Use when: creating a new module, adding module-{name}, "new feature module",
  "create module", "add module", registering a new preset, or modifying module manifests.
allowed-tools: [Read, Write, Edit, Glob, Grep, Bash]
---

# Module Creator for create-biomimic-app

Creates production-ready modules following all project conventions.

## Quick Start

When user says "create a module named X":

1. **Gather requirements** (use the checklist below)
2. **Create files bottom-up** (DB → schemas → routes → services → pages → manifest)
3. **Update generators** (if new file types or routes introduced)
4. **Register to preset** (modules.config.ts)
5. **Validate** (`cd template && npm run validate:modules`)

## Requirements Checklist

Before writing code, confirm with user:

```
Module name:         ___________ (kebab-case, e.g. "products")
Category:            core | communication | business | system
Depends on:          ___________ (e.g. ["permission"])
Route type:          client | admin | standalone
Has SSE:             yes | no
Has WebSocket:       yes | no
Has Admin page:      yes | no
DB table needed:     yes | no
```

If user omits details, infer from category:

| Category      | Default dependsOn | Route type | Admin page |
| ------------- | ----------------- | ---------- | ---------- |
| core          | []                | client     | no         |
| communication | []                | client     | no         |
| business      | ["permission"]    | client     | yes        |
| system        | []                | standalone | no         |

## File Creation Order (Bottom-Up)

Each step lists the exact file to create and the naming convention.

### Layer 1: DB Schema

**File**: `template/src/server/db/schema/{name}.ts`

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const { names } = sqliteTable('{name}', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // fields based on requirements
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})
```

Skip if module has no DB table.

### Layer 2: Shared Schemas

**File**: `template/src/shared/modules/{name}/schemas.ts`

```typescript
import { z } from '@hono/zod-openapi'

export const {Name}Schema = z.object({
  id: z.number().int().positive(),
  // fields
})
export type {Name} = z.infer<typeof {Name}Schema>

export const Create{Name}Schema = {Name}Schema.omit({ id: true })
export type Create{Name}Input = z.infer<typeof Create{Name}Schema>
```

**File**: `template/src/shared/modules/{name}/index.ts`

Export all schemas and types. For WS modules, add protocol schema here.

### Layer 3: Server Routes

**File**: `template/src/server/module-{name}/routes/{name}-routes.ts`

```typescript
import { createRoute } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import { z } from '@hono/zod-openapi'
import { successResponse, errorResponse } from '@server/utils/route-helpers'
// Import schemas from @shared/schemas

const listRoute = createRoute({
  method: 'get',
  path: '/{names}',
  responses: {
    200: successResponse(z.array({Name}Schema), 'List {names}'),
  },
})

export const apiRoutes = new OpenAPIHono()
  .openapi(listRoute, async c => {
    // Call service, return result
  })
```

**MUST** use chain syntax. **MUST** use `successResponse`/`errorResponse` helpers.

For SSE routes, see [references/sse-route-pattern.md](references/sse-route-pattern.md).
For WS routes, see [references/ws-route-pattern.md](references/ws-route-pattern.md).

### Layer 4: Server Services

**File**: `template/src/server/module-{name}/services/{name}-service.ts`

```typescript
import type { {Name}, Create{Name}Input } from '@shared/schemas'

export async function list{Names}(): Promise<{Name}[]> {
  // Business logic
}
```

No route definitions. No utility functions (those go to `@server/utils/`).

### Layer 5: Client/Admin Pages

**Client page**: `template/src/client/pages/{Name}Page.tsx`

**Admin page**: `template/src/admin/pages/{Name}Page.tsx` (only if module has admin)

**Client store**: `template/src/client/stores/{name}Store.ts`

Use `@shared/schemas` for types. Use `apiClient` for API calls. Never use raw `fetch`.

### Layer 6: Module Manifest

**File**: `template/src/server/module-{name}/module.ts`

```typescript
import type { ModuleManifest } from '@shared/core/module-manifest'

const {name}Manifest: ModuleManifest = {
  name: '{name}',
  description: '...',
  category: 'core', // or communication | business | system
  dependsOn: [],
  routes: {
    client: { mountPath: '/api', file: 'routes/{name}-routes.ts', exportName: 'apiRoutes' },
  },
  sharedSchemas: ['{name}'],
  clientPages: [{ name: '{Name}Page', path: '/{names}' }],
  clientStores: ['{name}Store'],
  dbSchemas: { files: ['{name}'] },
  providesMiddleware: [],
  hasSSE: false,
  hasWebSocket: false,
}

export default {name}Manifest
```

See [references/manifest-fields.md](references/manifest-fields.md) for all field options.

## Generator Updates

After creating files, check if generators need updates:

| New module adds...        | Generator to update                                |
| ------------------------- | -------------------------------------------------- |
| New route type (not /api) | `src/generators/route-registry.ts`                 |
| New middleware            | `src/generators/server-app.ts`                     |
| New shared schema module  | `src/generators/shared-schemas-index.ts`           |
| New client page           | `src/generators/client-app.ts`                     |
| New admin page            | `src/generators/admin-app.ts`                      |
| New client store          | `src/generators/client-components-index.ts`        |
| New DB schema             | `src/generators/db-schema-barrel.ts`, `db-init.ts` |
| New npm dependency        | `src/generators/package-json.ts`                   |
| New file type to exclude  | `src/generators/file-filter.ts`                    |
| New CLI commands          | `src/generators/cli-modules-index.ts`              |

**Rule**: Generators read from manifest dynamically. Most new modules need ZERO generator changes.

## Preset Registration

**File**: `template/modules.config.ts`

Add module name to the desired preset's module list, in dependency-safe order:

```typescript
export const TEMPLATE_PRESETS = {
  'fullstack-admin': {
    modules: ['todos', 'chat', 'notifications' /* ... */, , '{name}'],
  },
}
```

## Validation

```bash
# 1. Validate manifest structure
cd template && npm run validate:modules

# 2. Type check
npm run typecheck

# 3. Run tests
npm run test

# 4. Dry-run generation
cd /Users/xuyingzhou/Project/create-biomimic-app
npx tsx src/index.ts test-{name} /tmp/test-{name} --preset fullstack-admin --dry-run
```

All 4 must pass before considering the module complete.

## Naming Conventions

| Item              | Convention              | Example                   |
| ----------------- | ----------------------- | ------------------------- |
| Module directory  | `module-{name}`         | `module-products`         |
| Route file        | `{name}-routes.ts`      | `products-routes.ts`      |
| Service file      | `{name}-service.ts`     | `product-service.ts`      |
| Shared schema dir | `shared/modules/{name}` | `shared/modules/products` |
| DB schema file    | `db/schema/{name}.ts`   | `db/schema/products.ts`   |
| Client page       | `{Name}Page.tsx`        | `ProductsPage.tsx`        |
| Client store      | `{name}Store.ts`        | `productStore.ts`         |
| Route export      | `apiRoutes`             | Always `apiRoutes`        |
| Route mount path  | `/api`                  | Client routes             |

## Path Aliases (Mandatory)

```typescript
// Always use these, never deep relative paths
@shared/*    → template/src/shared/*
@client/*    → template/src/client/*
@server/*    → template/src/server/*
@admin/*     → template/src/admin/*
```

## Common Pitfalls

1. **Forgetting chain syntax** → Routes lose type inference. Always `new OpenAPIHono().openapi(...)`
2. **Using `z.boolean()` for success** → Use `z.literal(true)` for correct narrowing
3. **Middleware in route files** → Breaks types. Apply middleware only in `app.ts`
4. **Hardcoding module names in generators** → Read from `resolved.modules` dynamically
5. **Missing `as const` in responses** → `return c.json({ success: true as const, data })`

## Templates (8 files, one per layer)

| Layer    | Template                                                     | Description                        |
| -------- | ------------------------------------------------------------ | ---------------------------------- |
| DB       | [templates/db-schema.ts](templates/db-schema.ts)             | Drizzle table definition           |
| Shared   | [templates/shared-schemas.ts](templates/shared-schemas.ts)   | Zod schemas + TypeScript types     |
| Route    | [templates/server-route.ts](templates/server-route.ts)       | Full CRUD route (chain syntax)     |
| Service  | [templates/server-service.ts](templates/server-service.ts)   | Business logic (in-memory starter) |
| Manifest | [templates/module-manifest.ts](templates/module-manifest.ts) | ModuleManifest declaration         |
| Store    | [templates/client-store.ts](templates/client-store.ts)       | Zustand store with apiClient       |
| Client   | [templates/client-page.tsx](templates/client-page.tsx)       | Tailwind client page               |
| Admin    | [templates/admin-page.tsx](templates/admin-page.tsx)         | Ant Design admin page              |

## References (by scenario)

- [references/manifest-fields.md](references/manifest-fields.md) - All ModuleManifest fields
- [references/sse-route-pattern.md](references/sse-route-pattern.md) - SSE route pattern
- [references/ws-route-pattern.md](references/ws-route-pattern.md) - WebSocket route pattern
- [references/admin-module-pattern.md](references/admin-module-pattern.md) - Admin module pattern

## Skill Ecosystem

### Skill Trading Platform (插件市场)

This project has a **skill trading platform** (CLI + API server) at `/Users/xuyingzhou/Project/temporary/shabi-server/`.

```bash
# Setup (one-time)
cd /Users/xuyingzhou/Project/temporary/shabi-server/cli && npm run build && npm link

# Search skills in marketplace
skill search "crawler"              # by keyword
skill search --type service          # by type (package | service)
skill search --tag AI                # by tag

# View skill details
skill show <skillId>

# Publish your skill
skill publish --title "My Skill" --type package --price 5

# Buy & use
skill buy <skillId>
skill invoke <skillId> -p '{"url": "https://..."}'

# Check earnings
skill earnings
```

### Claude Code Official Skills

- **GitHub**: Search repos with `claude-code-skills` or `claude-skill` topics
- **Anthropic Docs**: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices

### Community Discovery

```bash
# Find skills via find-skills tool (in Claude Code)
# Just ask: "find a skill for X" and it searches available sources
```

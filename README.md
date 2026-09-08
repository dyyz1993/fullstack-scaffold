# create-fullstack-scaffold

[![npm version](https://img.shields.io/npm/v/create-fullstack-scaffold.svg)](https://www.npmjs.com/package/create-fullstack-scaffold)

Zero-config fullstack app generator with type-safe RPC, 15+ modules, and 8 production-ready presets. One command, zero `.env`, instant `npm run dev`.

## Quick Start

```bash
npx create-fullstack-scaffold@latest my-app
cd my-app && npm install && npm run dev
```

Open http://localhost:3010 — that's it. No `.env` required.

## Tech Stack

React + Hono + Vite + Zustand + TypeScript + Ant Design + Zod

| Layer      | Technology           | Purpose                             |
| ---------- | -------------------- | ----------------------------------- |
| Frontend   | React 19 + Vite      | Client SPA with HMR                 |
| Admin      | Ant Design 5         | Admin/merchant/tenant dashboards    |
| Backend    | Hono (OpenAPI)       | Type-safe RPC server                |
| State      | Zustand              | Client-side state management        |
| Validation | Zod                  | Shared schemas, end-to-end          |
| DB         | Drizzle ORM + SQLite | Pluggable data layer                |
| Realtime   | WebSocket + SSE      | Built-in typed protocols            |
| CLI        | Commander            | `biomimic` CLI for agent automation |

## Presets

8 presets. Each generates a different app by including/excluding modules.

| Preset                 | Modules                                                                                                                            | Use Case                     |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `fullstack-admin`      | todos, chat, notifications, file, captcha, permission, admin, auth, plugin, tenant, order, ticket, dispute, content, merchant (15) | Full-featured admin platform |
| `todo-app`             | todos, chat, notifications, auth (4)                                                                                               | Learning / simple app        |
| `ecommerce`            | todos, chat, notifications, file, permission, order, ticket, dispute, content (9)                                                  | E-commerce store             |
| `xbrowser-marketplace` | notifications, file, captcha, auth, permission, admin, plugin, order, ticket, dispute, content (11)                                | Plugin marketplace           |
| `forum`                | content, auth, permission, admin, notifications (5)                                                                                | Community forum              |
| `cli-only`             | todos, chat, notifications, auth (4)                                                                                               | CLI agent / no browser UI    |
| `minimal`              | todos (1)                                                                                                                          | Bare minimum starting point  |
| `saas`                 | todos, notifications, file, captcha, permission, auth, tenant, content (8)                                                         | Multi-tenant SaaS            |

```bash
# Choose a preset
npx create-fullstack-scaffold@latest my-app --preset ecommerce
```

## Type-Safe RPC

Every API call is fully typed — zero code generation, powered by Hono RPC.

```typescript
import { apiClient } from '@client/services/apiClient'

// HTTP — typed request + response
const res = await apiClient.api.todos.$get()
const { data } = await res.json() // data: Todo[]

// WebSocket — typed RPC + events
const ws = apiClient.api.chat.ws.$ws()
const result = await ws.call('echo', { message: 'hello' })

// SSE — typed server-push
const conn = await apiClient.api.notifications.stream.$sse()
conn.on('notification', n => console.log(n.title))

// Media — typed binary responses
const blob = await apiClient.api.avatar[':id'].$image({ param: { id: '123' } })
const svg = await apiClient.api.icon[':name'].$svg({ param: { name: 'home' } })
const file = await apiClient.api.export.$download()
```

| Protocol      | Method                                     | Return Type           |
| ------------- | ------------------------------------------ | --------------------- |
| HTTP JSON     | `$get()`, `$post()`, `$put()`, `$delete()` | `ClientResponse<T>`   |
| WebSocket     | `$ws()`                                    | `WSClient<Protocol>`  |
| SSE           | `$sse()`                                   | `SSEClient<Protocol>` |
| Image         | `$image()`                                 | `Promise<Blob>`       |
| SVG           | `$svg()`                                   | `Promise<string>`     |
| File Download | `$download()`                              | `Promise<Blob>`       |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Generated App                        │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │  Client   │  │  Admin   │  │  Tenant  │  │Merchant │ │
│  │ (React)   │  │(Ant Design)│ │(Ant Design)│ │(Ant Design)│
│  │ index.html│  │admin.html│  │tenant.html│  │merchant │ │
│  └─────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│        │              │              │              │      │
│        └──────────────┴──────────────┴──────────────┘      │
│                              │                              │
│                     apiClient (hc)                         │
│                     type-safe RPC                          │
│                              │                              │
│  ┌───────────────────────────┴───────────────────────────┐ │
│  │              Hono Server (Single Port)                  │ │
│  │                                                         │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────┐ │ │
│  │  │module-  │ │module-  │ │module-  │ │module-      │ │ │
│  │  │todos    │ │chat     │ │notifi-  │ │admin        │ │ │
│  │  │         │ │         │ │cations  │ │             │ │ │
│  │  │routes/  │ │routes/  │ │routes/  │ │routes/      │ │ │
│  │  │services/│ │services/│ │services/│ │services/    │ │ │
│  │  │__tests__/│ │__tests__/│ │__tests__/│ │__tests__/  │ │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────────┘ │ │
│  │  + 11 more modules (order, ticket, dispute, ...)      │ │
│  └───────────────────────────────────────────────────────┘ │
│                              │                              │
│                     ┌────────┴────────┐                     │
│                     │    Shared /     │                     │
│                     │  core/ (Zod)    │                     │
│                     │ modules/ (types)│                     │
│                     └─────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

### Module System

15 modules with declarative manifests (`module.ts`). Each declares routes, dependencies, DB schemas, CLI commands, and pages.

| Category      | Modules                                                              |
| ------------- | -------------------------------------------------------------------- |
| Core          | `todos`                                                              |
| Communication | `chat`, `notifications`                                              |
| System        | `permission`, `admin`, `auth`, `captcha`, `file`, `tenant`, `plugin` |
| Business      | `order`, `ticket`, `dispute`, `content`, `merchant`                  |

### Multi-Entry HTML

Up to 4 independent SPAs, generated based on preset modules:

| Entry    | File            | Included When                          |
| -------- | --------------- | -------------------------------------- |
| Client   | `index.html`    | Always                                 |
| Admin    | `admin.html`    | `admin` or `permission` module present |
| Tenant   | `tenant.html`   | `tenant` module present                |
| Merchant | `merchant.html` | `merchant` module present              |

Each entry has its own `App.tsx`, router, and layout — fully isolated.

### Module Dependency Graph

```
todos ──── (standalone)
chat ──── (standalone)
notifications ──── (standalone)
file ──── (standalone)
captcha ──── (standalone)
auth ──── (standalone)
permission ──── (standalone, foundational)
admin ────→ permission + notifications
plugin ────→ auth + permission + notifications
tenant ────→ auth + permission
order ────→ permission
ticket ────→ permission
dispute ────→ permission
content ────→ permission
merchant ────→ auth + permission
```

## Deployment

| Platform               | Entry                              | Command                                                |
| ---------------------- | ---------------------------------- | ------------------------------------------------------ |
| **Cloudflare Workers** | `src/server/entries/cloudflare.ts` | `wrangler deploy`                                      |
| **Node.js**            | `src/server/entries/node.ts`       | `node dist/server/entries/node.js`                     |
| **shanbox**            | Dockerfile included                | `docker build -t app . && docker run -p 3010:3010 app` |

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Development

```bash
npm run dev            # Start dev server on :3010 (no .env needed)
npm run build          # Production build
npm run typecheck      # TypeScript type check
npm run lint           # ESLint
npm run test           # Vitest (all tests)
npm run test:unit      # Unit tests only
npm run test:integration  # Integration tests only
npm run validate:modules   # Validate module manifests
```

## Project Structure

```
template/src/
├── client/              # React SPA (index.html)
│   ├── components/      # UI components
│   ├── stores/          # Zustand state
│   ├── services/        # apiClient
│   ├── hooks/           # Custom hooks
│   └── pages/           # Page components
├── admin/               # Admin dashboard (admin.html, Ant Design)
│   ├── components/
│   ├── stores/
│   ├── layouts/
│   └── pages/
├── tenant/              # Tenant dashboard (tenant.html, Ant Design)
│   └── ...
├── merchant/            # Merchant dashboard (merchant.html, Ant Design)
│   └── ...
├── server/              # Hono backend
│   ├── module-{name}/   # Feature modules (15+)
│   │   ├── module.ts    # Declarative manifest
│   │   ├── routes/      # API endpoints
│   │   ├── services/    # Business logic
│   │   └── __tests__/   # Module tests
│   ├── core/            # Runtime, realtime scanner
│   ├── middleware/      # Auth, CORS, logger, captcha
│   ├── db/              # Drizzle schema + migrations
│   ├── entries/         # node.ts, cloudflare.ts
│   └── test-utils/      # createTestClient, createTestServer
├── shared/              # Shared types (client + server)
│   ├── core/            # Framework: ws-client, sse-client, api-schemas
│   ├── modules/         # Business: todos, chat, notifications, ...
│   └── schemas/         # Unified re-exports
└── cli/                 # CLI agent (biomimic command)
    ├── modules/         # todo, notification, config, ...
    └── rpc/             # hc RPC client
```

### Path Aliases

| Alias       | Resolves To    |
| ----------- | -------------- |
| `@shared/*` | `src/shared/*` |
| `@client/*` | `src/client/*` |
| `@server/*` | `src/server/*` |
| `@admin/*`  | `src/admin/*`  |

## Testing

```typescript
import { createTestClient } from '@server/test-utils/test-client'

const client = createTestClient() // No server needed for HTTP/SSE

const res = await client.api.todos.$get() // Fully typed
const { data } = await res.json()
```

| Test Type | Needs Server | Tool                                           |
| --------- | ------------ | ---------------------------------------------- |
| HTTP API  | No           | `createTestClient()`                           |
| SSE       | No           | `$sse()` via `createTestClient()`              |
| WebSocket | Yes          | `createTestServer()` + `createTestClient(url)` |
| E2E       | Yes          | Playwright                                     |

## Quality Gates

- **TypeScript strict mode** — no `any`, explicit return types
- **ESLint** — 17 custom rules (chain syntax, layer boundaries, no inline schemas, ...)
- **Pre-commit hooks** — typecheck + lint-staged + smart tests
- **Module validation** — `npm run validate:modules` checks manifests
- **Production verified** — all 7 client presets pass `typecheck` + `build`

## Documentation

| File                 | Content                                   |
| -------------------- | ----------------------------------------- |
| `CLAUDE.md`          | Development guidelines for AI agents      |
| `.claude/rules/`     | 20+ detailed development constraint files |
| `template/CLAUDE.md` | Template-specific development guide       |

## License

MIT

---
name: project-setup-guide
description: >
  Guide for creating full-stack projects using create-biomimic-app CLI.
  Covers preset selection, module combinations, CLI usage, and post-generation verification.
  Use when: creating a new project, scaffolding an app, choosing a preset,
  "create project", "new app", "scaffold", "generate project", or using the CLI.
---

# Project Setup Guide

Create full-stack React + Hono applications with create-biomimic-app.

## Quick Start

```bash
npx create-biomimic-app my-project
# Interactive mode — select preset and modules

# Or specify preset directly
npx create-biomimic-app my-project --preset fullstack-admin
```

## Available Presets

| Preset | Modules | Use Case |
|--------|---------|----------|
| `minimal` | todos | Learning, prototyping |
| `todo-app` | todos + chat + notifications | Basic app with real-time |
| `ecommerce` | todos + chat + notifications + order + ticket + dispute + content + merchant | E-commerce platform |
| `fullstack-admin` | All 15 modules | Full admin dashboard (default) |

## All 15 Modules

| Category | Modules | Description |
|----------|---------|-------------|
| Core | todos | CRUD basics |
| Communication | chat, notifications | WebSocket + SSE real-time |
| Business | order, ticket, dispute, content, merchant | Business logic modules |
| System | permission, admin, captcha, file, auth, plugin, tenant | Infrastructure modules |

### Dependency Graph

```
todos ──── standalone
chat ──── standalone
notifications ──── standalone
file ──── standalone
captcha ──── standalone
permission ──── standalone (foundational)
auth ──── standalone
plugin ──── standalone
tenant ──── standalone
admin ───→ permission + notifications
order ──→ permission
ticket ──→ permission
dispute ──→ permission
content ──→ permission
merchant ──── standalone
```

## Generated Project Structure

```
my-project/
├── src/
│   ├── client/          # React SPA (Vite + React Router)
│   ├── admin/           # Admin dashboard (Ant Design)
│   ├── merchant/        # Merchant dashboard (if included)
│   ├── server/          # Hono API (OpenAPI RPC)
│   │   ├── module-*/    # Feature modules
│   │   ├── core/        # Framework layer
│   │   ├── middleware/   # Auth, CORS, logging
│   │   └── db/          # Drizzle ORM
│   ├── shared/          # Shared types (Zod schemas)
│   │   ├── core/        # Framework types
│   │   └── modules/     # Business schemas
│   └── cli/             # CLI RPC client
├── eslint-rules/        # Custom ESLint rules
├── lint-scripts/        # Validators
└── .claude/             # AI rules + skills
```

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Zustand
- **Admin**: Ant Design
- **Backend**: Hono, Drizzle ORM, Zod
- **Real-time**: WebSocket (rpc + events), SSE (typed streams)
- **Testing**: Vitest, Playwright
- **Linting**: ESLint flat config with 35 custom rules
- **CI**: GitHub Actions (typecheck, lint, test, E2E, security audit)

## Post-Generation Steps

```bash
cd my-project
npm install
cp .env.example .env        # Configure environment
npm run dev                  # Start dev server on :3010
npm run typecheck            # Verify types
npm run test                 # Run tests
npm run validate:all         # Run 14 validators
```

## Key Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server (frontend + backend on :3010) |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
| `npm run test` | All Vitest tests |
| `npm run test:e2e` | Playwright E2E |
| `npm run validate:all` | 14 custom validators |
| `npm run lint` | ESLint check |

## Type-Safe API Calls

```typescript
import { apiClient } from '@client/services/apiClient'

// HTTP RPC — fully typed
const res = await apiClient.api.todos.$get()
const data = await res.json()
// data.success === true → data.data is Todo[]

// WebSocket — typed rpc + events
const ws = apiClient.api.chat.ws.$ws()
const result = await ws.call('echo', { message: 'hello' })
ws.on('notification', n => console.log(n))

// SSE — typed events
const conn = await apiClient.api.notifications.stream.$sse()
conn.on('notification', n => console.log(n))
conn.on('ping', p => console.log(p.timestamp))
```

## Path Aliases

| Alias | Resolves To |
|-------|-------------|
| `@shared/*` | `src/shared/*` |
| `@client/*` | `src/client/*` |
| `@admin/*` | `src/admin/*` |
| `@server/*` | `src/server/*` |
| `@cli/*` | `src/cli/*` |

Max 2 levels of `../` enforced by ESLint rule `no-deep-relative-imports`.

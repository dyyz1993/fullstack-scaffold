# create-fullstack-scaffold

[![CI](https://github.com/dyyz1993/fullstack-scaffold/actions/workflows/ci.yml/badge.svg)](https://github.com/dyyz1993/fullstack-scaffold/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/create-fullstack-scaffold.svg)](https://www.npmjs.com/package/create-fullstack-scaffold)
[![license](https://img.shields.io/npm/l/create-fullstack-scaffold.svg)](https://github.com/dyyz1993/fullstack-scaffold/blob/master/LICENSE)

A full-stack application scaffold CLI — React 18 + Hono + TypeScript + Drizzle ORM + Ant Design, with built-in WebSocket, SSE, admin panel, and Cloudflare Workers support.

## Quick Start

```bash
npx create-fullstack-scaffold my-app
cd my-app
npm install
npm run dev
```

Open [http://localhost:3010](http://localhost:3010) — frontend and backend share a single port.

## Presets

Choose a template preset to match your project's scope:

| Preset                      | Modules                      | Best For                                             |
| --------------------------- | ---------------------------- | ---------------------------------------------------- |
| `fullstack-admin` (default) | All 11 modules               | Complete app with admin panel, RBAC, orders, tickets |
| `todo-app`                  | todos + chat + notifications | Learning, simple CRUD + real-time features           |
| `minimal`                   | todos only                   | Bare minimum, add modules as needed                  |

```bash
# Use a specific preset
npx create-fullstack-scaffold my-app --preset todo-app

# See all available presets
npx create-fullstack-scaffold presets
```

## Features

- **Full-Stack TypeScript** — Shared types, schemas, and RPC between frontend and backend
- **React 18 + Ant Design** — Modern UI with comprehensive component library
- **Hono Backend** — Lightweight, fast HTTP framework with end-to-end type-safe RPC
- **Drizzle ORM** — Type-safe database queries with SQLite, MySQL, and D1 support
- **Real-time** — Typed WebSocket (`$ws()`) and Server-Sent Events (`$sse()`)
- **Admin Panel** — Roles, permissions, audit logs, content management, and agent module
- **Module-based Architecture** — Feature modules with routes, services, and tests
- **Cloudflare Workers** — Deploy to edge with D1 database via `wrangler`
- **CLI Tool** — Built-in CLI for database management and module scaffolding
- **Testing** — Vitest unit/integration tests + Playwright E2E, enforced via pre-commit hooks
- **Code Quality** — ESLint, Prettier, Husky, lint-staged, layer boundary rules

## Tech Stack

| Layer     | Technology                                       |
| --------- | ------------------------------------------------ |
| Frontend  | React 18, Ant Design, Zustand, React Router      |
| Backend   | Hono, Drizzle ORM, Zod validation                |
| Database  | SQLite (dev), MySQL (prod), Cloudflare D1 (edge) |
| Real-time | WebSocket (ws), Server-Sent Events               |
| Build     | Vite, tsup, TypeScript 5                         |
| Testing   | Vitest, Playwright, Testing Library              |
| CI/CD     | GitHub Actions (multi-OS + cross-browser)        |

## Project Structure

```
create-fullstack-scaffold/
├── src/                        # CLI source code
│   ├── commands/               # CLI commands
│   └── index.ts                # CLI entry point
└── template/                   # App template (copied to user projects)
    ├── src/
    │   ├── admin/              # Admin panel (React + Ant Design)
    │   ├── client/             # Client-facing app (React)
    │   ├── server/             # Hono backend
    │   │   ├── core/           # Framework (realtime, runtime adapters)
    │   │   ├── module-admin/   # Admin & RBAC
    │   │   ├── module-agent/   # AI agent module
    │   │   ├── module-chat/    # WebSocket chat
    │   │   ├── module-content/ # CMS
    │   │   ├── module-file/    # File upload & storage
    │   │   ├── module-order/   # Orders
    │   │   ├── module-ticket/  # Ticketing
    │   │   ├── module-todos/   # Todos (example module)
    │   │   ├── module-notifications/ # SSE notifications
    │   │   ├── module-captcha/ # CAPTCHA
    │   │   ├── module-permission/ # Permissions
    │   │   ├── module-dispute/ # Disputes
    │   │   ├── middleware/      # Auth, rate-limit, captcha
    │   │   └── entries/        # Node.js & Cloudflare entry points
    │   ├── shared/             # Shared types, schemas, hooks
    │   ├── cli/                # App-level CLI
    │   └── types/              # Global type definitions
    └── tests/                  # E2E tests (Playwright)
```

## Hono RPC — Type-Safe APIs

Routes use chain syntax with full type inference:

```typescript
// Server: define routes
export const apiRoutes = new OpenAPIHono()
  .openapi(listRoute, async (c) => {
    /* ... */
  })
  .openapi(createRoute, async (c) => {
    /* ... */
  });
```

```typescript
// Client: fully typed API calls
import { apiClient } from "@client/services/apiClient";

const response = await apiClient.api.todos.$get();
const result = await response.json(); // Fully typed!

// WebSocket
const ws = apiClient.api.chat.ws.$ws();
const echo = await ws.call("echo", { message: "hello" });

// SSE
const conn = await apiClient.api.notifications.stream.$sse();
conn.on("notification", (n) => console.log(n));
```

## Environment Variables

Key environment variables (see `template/.env.example` for the full list):

| Variable               | Description                                         | Default       |
| ---------------------- | --------------------------------------------------- | ------------- |
| `PORT`                 | Server port                                         | `3010`        |
| `NODE_ENV`             | Environment (`development` / `test` / `production`) | `development` |
| `DB_DRIVER`            | Database driver (`sqlite` / `mysql` / `d1`)         | `sqlite`      |
| `AUTH_SECRET_KEY`      | JWT signing key (**required in production**)        | —             |
| `FILE_SECRET_KEY`      | Secret for signed file URLs (**required**)          | —             |
| `CORS_ORIGIN`          | Comma-separated allowed origins                     | —             |
| `ENABLE_DOCS`          | Enable Swagger/OpenAPI UI                           | `true`        |
| `RATE_LIMIT_MAX`       | Max requests per window                             | `100`         |
| `RATE_LIMIT_WINDOW`    | Rate limit window in ms                             | `60000`       |
| `VITE_USE_MOCK_SERVER` | Use mock server in frontend dev                     | `true`        |

## Deployment

### Node.js (MySQL / SQLite)

```bash
npm run build
NODE_ENV=production AUTH_SECRET_KEY=your-secret npm start
```

### Cloudflare Workers (D1)

```bash
npm run deploy:cf
```

See `template/wrangler.toml` for Cloudflare configuration.

## Development

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full development guide.

```bash
# Install dependencies
npm install

# Start dev server (frontend + backend on port 3010)
npm run dev

# Run unit & integration tests
npm test

# Run E2E tests
npm run test:e2e

# Type check & lint
npm run typecheck
npm run lint
```

## Scripts

| Script                  | Description                              |
| ----------------------- | ---------------------------------------- |
| `npm run dev`           | Start dev server with hot reload         |
| `npm run build`         | Production build (client + server)       |
| `npm run build:all`     | Build client + server + CLI              |
| `npm start`             | Run production server                    |
| `npm test`              | Run Vitest tests (watch mode)            |
| `npm run test:coverage` | Run tests with coverage report           |
| `npm run test:e2e`      | Run Playwright E2E tests                 |
| `npm run test:full`     | Run all tests (unit + integration + E2E) |
| `npm run typecheck`     | TypeScript type checking + ESLint        |
| `npm run lint`          | ESLint check                             |
| `npm run format`        | Prettier formatting                      |
| `npm run db:generate`   | Generate Drizzle migrations              |
| `npm run db:migrate`    | Run database migrations                  |
| `npm run db:studio`     | Open Drizzle Studio                      |
| `npm run create:module` | Scaffold a new feature module            |

## License

MIT

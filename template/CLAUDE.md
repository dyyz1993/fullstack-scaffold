# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Todo Application Template - A full-stack React + Hono application demonstrating best practices for monorepo-style architecture with single-port development.

## Commands

```bash
npm run dev          # Start Vite dev server on port 3010 with Hono backend
npm run build        # Production build
npm run preview      # Preview production build
npm run test         # Run all Vitest tests
npm run test:unit    # Run unit tests only
npm run test:integration  # Run integration tests only
npm run lint         # Run ESLint
npm run format       # Run Prettier format
npm run typecheck    # Run TypeScript type check
```

## Architecture Overview

**Monorepo-style structure** with client/server separation and shared types:

```
src/
├── client/          # React frontend
│   ├── components/  # UI components
│   ├── stores/      # Zustand state management
│   ├── services/    # API clients (wsClient, sseClient, apiClient)
│   ├── hooks/       # Custom hooks (useWS, useSSE)
│   ├── test/        # Test setup
│   └── App.tsx
├── server/          # Hono backend
│   ├── module-todos/   # Todo module
│   ├── module-chat/    # WebSocket chat module
│   ├── module-notifications/ # SSE notifications module
│   ├── core/           # Core services (realtime)
│   ├── test-utils/     # Test utilities
│   └── index.ts
└── shared/          # Shared types
    ├── schemas/    # Zod schemas
    └── types/      # TypeScript types
```

**Path Aliases** (configured in vite.config.ts and tsconfig.json):

- `@shared/*` → src/shared/\*
- `@client/*` → src/client/\*
- `@server/*` → src/server/\*

## Key Technical Concepts

### Single-Port Development

Uses `@hono/vite-dev-server` to run both frontend and backend on port 3010:

- No CORS issues in development
- Type safety across the boundary
- Simplified developer experience

### Hono RPC

Type-safe API calls from frontend to backend:

```typescript
import { apiClient } from '@client/services/apiClient'

// HTTP API
const response = await apiClient.api.todos.$get()
const result = await response.json()

// WebSocket
const ws = apiClient.api.chat.ws.$ws()
const result = await ws.call('echo', { message: 'hello' })

// SSE
const conn = await apiClient.api.notifications.stream.$sse()
conn.on('notification', n => console.log(n))
```

### Real-time Features

| Feature   | Method              | Type Safety | Testing          |
| --------- | ------------------- | ----------- | ---------------- |
| HTTP API  | `$get()`, `$post()` | ✅          | No server needed |
| WebSocket | `$ws()`             | ✅          | Requires server  |
| SSE       | `$sse()`            | ✅          | No server needed |

### Module Pattern

Backend organized by feature modules:

```
module-{feature}/
├── routes/         # API endpoints (Hono RPC)
├── services/       # Business logic
└── __tests__/      # Unit tests
```

### State Management with Zustand

Global application state in `src/client/stores/`:

- **Minimal Re-renders**: Use precise selector hooks
- **Selector Pattern**: `const todos = useTodoStore((state) => state.todos)`
- **Action Selectors**: Stable function references

### Testing Strategy

- **Unit Tests**: `__tests__/*.test.ts` (jsdom for client, node for server)
- **Integration Tests**: `src/server/integration/*.test.ts`
- **E2E Tests**: `tests/e2e/*.spec.ts` (Playwright)
- **WebSocket Tests**: Require real server (`createTestServer`)
- **SSE Tests**: No server needed (`$sse()` works with `app.fetch()`)

## Important Conventions

### Import Path Aliases

Always use path aliases instead of relative imports:

```typescript
import { Todo } from '@shared/types'
import { useTodoStore } from '@client/stores/todoStore'
```

### Environment Variables

Required variables (see `.env.example`):

```bash
API_BASE_URL=http://localhost:3010
```

### Module Creation

To add a new feature module:

1. Create `src/server/module-{feature}/`
2. Add routes, services, tests
3. Register in `src/server/app.ts`
4. Add client store if needed
5. Add integration tests

### API Route Pattern

Use Hono RPC with chain syntax:

```typescript
app.openapi(listRoute, async c => {
  const todos = await todoService.listTodos()
  return c.json({ success: true, data: todos })
})
```

### WebSocket Pattern

Use `$ws()` method for type-safe WebSocket:

```typescript
// Server: Define WSProtocol schema
const AppWSProtocolSchema = z.object({
  rpc: z.object({
    echo: z.object({
      in: z.object({ message: z.string() }),
      out: z.object({ message: z.string() }),
    }),
  }),
  events: z.object({
    notification: z.object({ message: z.string() }),
  }),
})

// Client: Use $ws()
const ws = apiClient.api.chat.ws.$ws()
const result = await ws.call('echo', { message: 'hello' })
ws.on('notification', n => console.log(n))
```

### SSE Pattern

Use `$sse()` method for type-safe SSE:

```typescript
// Server: Define SSEProtocol schema
const AppSSEProtocolSchema = z.object({
  events: z.object({
    notification: NotificationSchema,
    ping: z.object({ timestamp: z.number() }),
  }),
})

// Client: Use $sse()
const conn = await apiClient.api.notifications.stream.$sse()
conn.on('notification', n => console.log(n))
conn.on('ping', p => console.log(p.timestamp))
```

## Project Rules

See `.claude/rules/` for detailed development constraints:

- `project-rules.md` - Environment & constants management
- `client-component-rules.md` - React component patterns
- `client-service-rules.md` - Service layer patterns
- `zustand-rules.md` - Zustand store patterns
- `websocket-rules.md` - WebSocket development patterns
- `sse-rules.md` - SSE development patterns
- `testing-standards.md` - Testing conventions
- `hono-testing-best-practices.md` - Hono testing patterns

## Documentation

- `README.md` - User-facing feature overview
- `DESIGN.md` - Technical architecture
- `QUICKSTART.md` - Quick start guide

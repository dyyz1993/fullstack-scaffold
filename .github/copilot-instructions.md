# GitHub Copilot Instructions

## Project: create-fullstack-scaffold

A CLI scaffolding tool that generates full-stack React + Hono + TypeScript applications.

## Key Patterns

- Path aliases: @server, @shared, @client, @admin, @cli (max 2 levels ../)
- Hono RPC: Use `createRoute()` + `.openapi()` for type-safe routes (chain syntax required)
- Zod schemas for all API validation (define in `shared/modules/`, never inline)
- Use `successResponse()` / `errorResponse()` helpers for route responses
- Use `z.literal(true)` for success fields, never `z.boolean()`
- Vitest + Playwright for testing

## When generating code:

1. Use path aliases instead of deep relative imports
2. Follow the module pattern: `module-{feature}/routes/` + `services/` + `__tests__/`
3. Use `@hono/zod-openapi` `createRoute()` for new API endpoints
4. Add Zod schemas for request/response validation (in shared layer)
5. Write tests alongside source files (e.g., `todos-routes.ts` → `todos-routes.test.ts`)
6. Apply middleware in `app.ts` only, never in route files
7. Use `c.req.valid('json'/'query'/'param')` for typed request data

## Type-safe real-time:

- WebSocket: `apiClient.api.xxx.ws.$ws()` — never `new WebSocket()`
- SSE: `apiClient.api.xxx.stream.$sse()` — never `new EventSource()`
- Use `useWebSocket` / `useSSE` hooks in React components

## See also

- `.opencode/rules/path-alias-guide.md` — Path alias rules
- `.opencode/rules/rpc-type-guide.md` — RPC/SSE/WS type inference guide
- `template/.claude/rules/` — Comprehensive scaffolded project rules (19 files)
- `template/eslint-rules/` — Custom ESLint rules (30+ rules)

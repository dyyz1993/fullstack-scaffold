# create-biomimic-app — Project Guide

## Project Overview

CLI scaffolding tool (`npx create-biomimic-app`) that generates a full-stack React + Hono + TypeScript application.

## Architecture

- **Root (`/`)**: CLI tool (`src/`) — the npm package users install
- **Template (`/template/`)**: Full-stack app template copied to user projects
  - `template/src/server/` — Hono backend (15+ modules)
  - `template/src/client/` — React frontend
  - `template/src/admin/` — Admin panel (React + Ant Design)
  - `template/src/shared/` — Shared types, schemas, hooks
  - `template/src/cli/` — App-level CLI

## Commands

```bash
npm run dev          # Start template dev server (port 3010)
npm test             # Run all tests (Vitest)
npm run test:e2e     # Playwright E2E tests
npm run typecheck    # TypeScript check
npm run lint         # ESLint check
npm run build        # Production build
npm run test:template    # Run template tests
npm run lint:template    # Lint template code
npm run validate:template # Full template validation
```

## Key Conventions

- **Path aliases**: @server, @shared, @client, @admin, @cli (max 2 levels of `../`)
- **TypeScript strict**: No `any` in production code
- **Testing**: Vitest + Playwright, tests alongside source files
- **Commit**: Conventional commits (feat/fix/docs/refactor/test/chore)
- **Pre-push hook**: Full test suite runs before push allowed
- **Hono RPC**: Use `createRoute()` + `openapi()` for type-safe API routes
- **Zod schemas**: All API validation uses Zod
- **Framework layer**: `shared/core/` and `server/core/` are protected — modify only with `@framework-modify` annotation

## Template RPC Type System

See `.opencode/rules/rpc-type-guide.md` for the full guide covering HTTP RPC, SSE, and WebSocket type inference.

## Rules Files

- `.opencode/rules/` — OpenCode rules (auto-loaded)
- `.cursorrules` — Cursor editor rules
- `.github/copilot-instructions.md` — GitHub Copilot rules
- `template/.claude/rules/` — Rules for scaffolded projects (19 files)
- `template/eslint-rules/` — Custom ESLint rules (30+ rules)

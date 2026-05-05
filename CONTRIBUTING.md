# Contributing to create-biomimic-app

Thank you for your interest in contributing! This guide will help you get started.

## Project Overview

**create-biomimic-app** is a CLI scaffolding tool that generates full-stack React + Hono + TypeScript applications. The project has two main parts:

- **Root (`/`)** — The CLI tool itself (`src/`) that users run via `npx create-biomimic-app`
- **Template (`/template`)** — The full-stack app template that gets copied to the user's project

The generated app uses a monorepo-style architecture with single-port development (frontend + backend on port 3010), Hono RPC for type-safe APIs, and a module-based backend.

## Development Setup

### Prerequisites

- **Node.js** >= 18.0.0 (20.x recommended, see `.nvmrc`)
- **npm** (comes with Node.js)

### Install & Run

```bash
# Clone the repo
git clone https://github.com/dyyz1993/create-biomimic-app.git
cd create-biomimic-app

# Install root dependencies
npm install

# Install template dependencies
cd template && npm install && cd ..

# Run the CLI locally
npx tsx src/index.ts my-app

# Start template dev server
cd template && npm run dev
```

## Project Structure

```
create-biomimic-app/
├── src/                  # CLI source code
│   └── index.ts          # CLI entry point
├── template/             # Generated app template
│   ├── src/
│   │   ├── client/       # React frontend (components, stores, services)
│   │   ├── server/       # Hono backend (modules, middleware, entries)
│   │   └── shared/       # Shared types and schemas
│   ├── tests/            # E2E tests (Playwright)
│   └── package.json      # Template dependencies
├── .github/workflows/    # CI/CD
└── package.json          # Root (CLI) dependencies
```

## How to Add a New Module to the Template

Modules follow a consistent pattern in `template/src/server/`:

1. **Create the module directory**: `template/src/server/module-{feature}/`
2. **Add routes**: `module-{feature}/routes/` — Define Hono RPC endpoints
3. **Add services**: `module-{feature}/services/` — Business logic
4. **Add shared schemas**: `template/src/shared/modules/{feature}/` — Zod schemas and types
5. **Register the module**: Add routes to `template/src/server/app.ts`
6. **Add client store** (optional): `template/src/client/stores/` — Zustand store
7. **Add tests**: Unit tests in `module-{feature}/__tests__/`

Example module structure:

```
module-todos/
├── routes/
│   └── todo-routes.ts
├── services/
│   └── todo-service.ts
└── __tests__/
    └── todo-service.test.ts
```

## Testing Guidelines

### Unit Tests

- Framework: **Vitest** with jsdom (client) or node (server) environment
- Location: `__tests__/*.test.ts` alongside source files
- Run: `npm run test:template` (from root) or `npm test` (from template)

### Integration Tests

- Framework: **Vitest** with custom config (`vitest.integration.config.ts`)
- Location: `src/server/__tests__/integration/`
- Run: `npm run test:integration`

### E2E Tests

- Framework: **Playwright**
- Location: `tests/e2e/*.spec.ts`
- Run: `npm run test:e2e`

### Running All Tests

```bash
# From template directory
npm run test:full

# From root (runs template tests)
npm run test:template
```

## Commit Message Conventions

This project uses [Commitlint](https://commitlint.js.org/) with the Conventional Commits config. The following types are allowed:

| Type       | Description                        |
|------------|------------------------------------|
| `feat`     | A new feature                      |
| `fix`      | A bug fix                          |
| `docs`     | Documentation changes              |
| `style`    | Code style changes (formatting)    |
| `refactor` | Code refactoring                   |
| `test`     | Adding or updating tests           |
| `chore`    | Build/tooling changes              |
| `revert`   | Revert a previous commit           |

**Format**: `type: subject` (subject max 80 chars, body max 200 chars per line)

Examples:
```
feat: add user authentication module
fix: resolve WebSocket reconnection issue
docs: update CONTRIBUTING.md with testing guidelines
test: add integration tests for todo service
```

Pre-commit hooks (via Husky + lint-staged) automatically run linting, formatting, and validation on staged files.

## Pull Request Process

1. **Fork** the repository and create a feature branch from `master`
2. **Make changes** following the conventions above
3. **Add tests** for any new functionality
4. **Run checks locally**:
   ```bash
   npm run typecheck          # Type check root
   npm run typecheck:template # Type check template
   npm run lint               # Lint root
   npm run lint:template      # Lint template
   npm run test:template      # Run template tests
   ```
5. **Commit** with conventional commit messages
6. **Open a PR** against `master` with a clear description of changes
7. Ensure CI passes (CLI checks, template checks, E2E tests)

## Code Quality Tools

- **ESLint** — Linting with TypeScript, React, and React Hooks plugins
- **Prettier** — Code formatting
- **TypeScript** — Strict type checking
- **Husky** — Git hooks
- **lint-staged** — Run checks on staged files only

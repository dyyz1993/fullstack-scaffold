# create-biomimic-app

Create a new BioMimic app with full-stack React + Hono + TypeScript architecture.

## 🚀 Usage

```bash
# Local testing
cd /Users/xuyingzhou/Project/create-biomimic-app
npm install
npx tsx src/index.ts my-app

# After publishing to npm
npx create-biomimic-app my-app
```

## 📦 What's Included

### Architecture
- **Monorepo-style**: client/server/shared separation
- **Single-port development**: Frontend + Backend on port 3010
- **Path aliases**: @shared, @client, @server
- **Hono RPC**: End-to-end type safety with chain syntax
- **Module-based backend**: Feature modules (routes + services)

### Tech Stack
- ⚡️ **Vite** - Lightning fast build tool
- ⚛️ **React 19** - Latest React features
- 🔥 **Hono** - Fast web framework
- 🗃️ **Zustand** - Minimal state management
- 📘 **TypeScript** - Type safety
- 🧪 **Vitest** - Unit + integration tests
- 🗄️ **Drizzle ORM** - Type-safe database access

### Code Quality
- ESLint + Prettier
- Pre-commit hooks (lint-staged + test + validate)
- Testing infrastructure (jsdom + node)

## 🏗️ Project Structure

```
my-app/
├── src/
│   ├── client/          # React frontend
│   │   ├── components/  # UI components + tests
│   │   ├── stores/      # Zustand stores + tests
│   │   ├── services/    # API clients
│   │   ├── test/        # Test setup
│   │   └── App.tsx
│   ├── server/          # Hono backend
│   │   ├── module-todos/ # Todo module
│   │   │   ├── routes/  # Hono RPC routes (chain syntax!)
│   │   │   ├── services/
│   │   │   └── __tests__/
│   │   ├── shared/      # Database (Drizzle)
│   │   ├── integration/ # Integration tests
│   │   └── index.ts
│   └── shared/          # Shared types
│       ├── types.ts
│       ├── schemas.ts
│       └── rpc-server.ts
├── scripts/             # Validators
├── .husky/              # Git hooks
├── vite.config.ts       # Single-port config
├── vitest.config.ts     # Unit tests
└── vitest.integration.config.ts  # Integration tests
```

## 🎯 After Creation

```bash
cd my-app
npm install
npm run dev      # http://localhost:3010
npm test         # Run tests
```

## 🔑 Key Features

### Hono RPC Chain Syntax
Routes use chain syntax for type inference:

```typescript
export const apiRoutes = new OpenAPIHono()
  .openapi(listRoute, async (c) => { ... })
  .openapi(getRoute, async (c) => { ... })
  .openapi(createRoute, async (c) => { ... });
```

### Type-Safe API Calls
```typescript
import { rpcClient } from '@shared/rpc-server';

const response = await rpcClient.api.todos.$get();
const result = await response.json(); // Fully typed!
```

### Zustand with Selectors
```typescript
// Minimal re-renders with precise selectors
const todos = useTodoStore((state) => state.todos);
const addTodo = useTodoStore((state) => state.addTodo);
```

## 📝 License

MIT

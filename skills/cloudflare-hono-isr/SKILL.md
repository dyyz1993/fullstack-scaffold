---
name: cloudflare-hono-isr
slug: cloudflare-hono-isr
version: 1.0.0
homepage: https://github.com/dyyz1993/fullstack-scaffold
description: Configure React SSR + ISR for Hono apps on Cloudflare Workers. Provides end-to-end guidance for rendering real HTML with meta tags.
changelog: Initial version with SSR/ISR pipeline support
metadata:
  {
    'clawdbot':
      {
        'emoji': '🌐',
        'requires': ['npx', 'wrangler', 'react', 'react-dom'],
        'bins': ['wrangler'],
      },
    'os': ['linux', 'darwin', 'win32'],
  }
---

# Cloudflare Hono + ISR (React SSR)

Configures Incremental Static Regeneration with real React SSR for Hono applications on Cloudflare Workers.

## When to Use

Use when:

- Building SEO-friendly React apps with Hono on Cloudflare Workers
- Need server-rendered HTML with meta tags for ISR routes
- Want ISR (Incremental Static Regeneration) with cache invalidation
- Using React Router v7 with `renderToString`
- Have lazy-loaded page components (Suspense handling)

## Architecture

```
ISR Pipeline Flow:
1. Client Request → CF Worker
2. ISR Registry Match → Fetch Data
3. renderSSR(pathname, data) → React HTML + Helmet meta
4. renderISRPage → Inject body + meta into template
5. Cache in KV (fresh/stale/while-revalidate)
6. Return HTML with X-ISR headers
```

## Quick Reference

| Topic        | Key Files                               |
| ------------ | --------------------------------------- |
| SSR Entry    | `src/client/entry-server.tsx`           |
| ISR Registry | `src/server/core/isr-registry.ts`       |
| ISR Renderer | `src/server/core/isr-renderer.ts`       |
| CF Entry     | `src/server/entries/cloudflare.ts`      |
| Build Config | `tsup.config.ts` (React SSR noExternal) |

## Prerequisites

- Hono app with `@hono/zod-openapi` for RPC
- React 18+ with `react-dom/server`
- React Router v7 for routing
- Cloudflare D1 (database)
- Cloudflare KV (ISR cache)

## Core Rules

### 1. SSR Entry Separation

**Requirement**: Split routes from BrowserRouter to avoid nested router conflicts.

```tsx
// App.tsx (client)
<BrowserRouter>
  <AppRoutes />
</BrowserRouter>

// entry-server.tsx (SSR)
<HelmetProvider>
  <StaticRouter location={pathname}>
    <AppRoutes />
  </StaticRouter>
</HelmetProvider>
```

**Why**: `StaticRouter` + `BrowserRouter` in same tree would conflict.

### 2. Suspense for Lazy Components

**Requirement**: Wrap `<Routes>` in `<Suspense>` so layout renders even with lazy pages.

```tsx
// AppRoutes.tsx
<Suspense fallback={<div>Loading...</div>}>
  <Routes>...</Routes>
</Suspense>
```

**Why**: `renderToString` doesn't support React.lazy without Suspense boundary.

### 3. Build Configuration

**Requirement**: Add React SSR stack to `tsup.config.ts` `noExternal`.

```javascript
// tsup.config.ts
noExternal: [
  'react',
  'react-dom',
  'react-dom/server',
  'react-router-dom',
  'react-helmet-async',
  'zustand',
]
```

**Why**: Bundle React SSR code into CF Worker bundle.

### 4. CSS/Image Loaders

**Requirement**: Set CSS/image loaders to `'empty'` in esbuild options.

```javascript
options.loader = {
  '.css': 'empty',
  '.png': 'empty',
  '.jpg': 'empty',
  // ... other assets
}
```

**Why**: CSS handled by client build, SSR only needs HTML.

### 5. Helmet Title Extraction

**Requirement**: Extract text from helmet title string (removes HTML tags).

```typescript
const helmetTitle = ssrResult.helmet.title
  ?.replace(/<title[^>]*>/, '')
  ?.replace(/<\/title>/, '')
  ?.trim()
```

**Why**: `helmet.title.toString()` returns `<title data-rh="true">Text</title>`.

### 6. ISR Data Flow

**Requirement**: Data flows from ISR entry → renderSSR → Zustand store → components.

```typescript
// 1. ISR entry fetches data
const data = await entry.fetch(pathname, ctx)

// 2. renderSSR pre-populates store
useTodoStore.setState({ todos: data.todos, loading: false })

// 3. renderToString, then restore
const html = renderToString(...)
useTodoStore.setState({ prevTodos, prevLoading })
```

**Why**: Components read from store during SSR rendering.

## Common Traps

| Trap                     | Cause                      | Fix                                             |
| ------------------------ | -------------------------- | ----------------------------------------------- |
| **Empty body**           | Suspense wraps entire app  | Move Suspense inside Layout, around Routes only |
| **Title mangled**        | Helmet title has HTML tags | Use regex to extract text                       |
| **Build errors**         | Missing noExternal         | Add React stack to tsup noExternal              |
| **CSS missing**          | No CSS loader              | Set `.css: 'empty'` in esbuild options          |
| **Lazy throws**          | No Suspense boundary       | Wrap Routes in `<Suspense>`                     |
| **Meta tags duplicated** | Template already has meta  | `renderISRPage` replaces/merges meta            |

## Workflow

### 1. Create SSR Entry (`entry-server.tsx`)

```tsx
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { AppRoutes } from './AppRoutes'

export function renderSSR(pathname: string, data: SSRData): SSRRenderResult {
  const helmetContext = {}
  const html = renderToString(
    <HelmetProvider context={helmetContext}>
      <StaticRouter location={pathname}>
        <AppRoutes presetId="todo" />
      </StaticRouter>
    </HelmetProvider>
  )
  return { html, helmet: extractHelmet(helmetContext) }
}
```

### 2. Update ISR Registry (`isr-registry.ts`)

```typescript
export interface ISRRouteEntry {
  module: string
  match: ISRMatcher
  fetch: (pathname: string, ctx: ISRRouterContext) => Promise<unknown>
  meta: (data: unknown, pathname: string) => { title: string; description: string }
  maxAge?: number
}
```

**No `render` field** — rendering handled by entry-server.

### 3. Update Cloudflare Entry (`cloudflare.ts`)

```typescript
import { renderSSR } from '@client/entry-server'

async function renderISRForRoute(pathname: string, env, request): Promise<string> {
  const entry = isrRegistry.match(pathname)
  const data = await entry.fetch(pathname, { db: env.DB, env })
  const meta = entry.meta(data, pathname)

  // Render React SSR
  const ssrResult = renderSSR(pathname, data)
  const helmetTitle = extractTitle(ssrResult.helmet.title)

  return renderISRPage({
    template: cachedTemplate,
    body: ssrResult.html,
    meta: { ...meta, title: helmetTitle || meta.title },
  })
}
```

### 4. Build & Deploy

```bash
npm run build        # vite + tsup
unset http_proxy      # Remove proxy for wrangler
npx wrangler deploy  # Deploy to CF Workers
```

### 5. Verify

```bash
curl -I https://your-worker.workers.dev/todos
# Should see: X-ISR-Status: fresh | miss | stale

curl -s https://your-worker.workers.dev/todos | grep '<title>'
# Should see: <title>Todo List - Your App</title>
```

## SEO Output Structure

```
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Your Title</title>  ← From ISR meta or Helmet
    <meta name="description" content="..." />
    <meta property="og:title" content="..." />
    <meta name="generator" content="ISR-SSG" />
  </head>
  <body>
    <div id="root">
      <!-- Layout HTML (nav, footer) -->
      <nav>...</nav>
      <main>
        <!-- Suspense fallback or real content -->
        <div>Loading...</div>
      </main>
      <footer>...</footer>
    </div>
  </body>
</html>
```

## ISR Cache Headers

| Header                 | Meaning                                        |
| ---------------------- | ---------------------------------------------- |
| `X-ISR-Status: fresh`  | Served from cache, not expired                 |
| `X-ISR-Status: stale`  | Served stale cache, regenerating in background |
| `X-ISR-Status: miss`   | Not cached, freshly rendered                   |
| `X-ISR-Rendered: true` | Contains SSR HTML (vs SPA-only)                |

## Module ISR Registration Pattern

```typescript
// src/server/module-todos/isr.ts
import { isrRegistry } from '@server/core/isr-registry'

async function fetchTodos(): Promise<TodoData> {
  const { todos } = await listTodos({ limit: 20 })
  return { todos }
}

function todoMeta(): { title: string; description: string } {
  return {
    title: 'Todo List - Your App',
    description: 'Manage your todos with real-time updates',
  }
}

isrRegistry.register({
  module: 'todos',
  match: '/todos',
  fetch: fetchTodos,
  meta: () => todoMeta(),
  maxAge: 3600, // 1 hour
})
```

## Known Limitations

1. **Lazy Components**: Page components show "Loading..." in SSR (normal — hydrates client-side)
2. **Streaming**: Not using `renderToPipeableStream` — CF Workers compatibility
3. **Client-only Code**: Components with browser APIs need `typeof window !== 'undefined'` guards
4. **DB Errors**: Falls through to default meta if fetch throws (log errors in console)

## Debugging

### Check SSR in bundle

```bash
rg "renderToString|StaticRouter|AppRoutes" dist/cloudflare/cloudflare.js
# Should find all SSR code
```

### Test SSR locally

```bash
node -e "
const { renderSSR } = require('./dist/cloudflare/cloudflare.js')
const result = renderSSR('/todos', { todos: [{ id: 1, title: 'Test', status: 'pending' }] })
console.log('HTML length:', result.html.length)
console.log('Title:', result.helmet.title)
"
```

### View CF Worker logs

```bash
npx wrangler tail
```

## References

- React SSR: https://react.dev/reference/react-dom/server/renderToString
- Hono: https://hono.dev/
- Cloudflare Workers: https://developers.cloudflare.com/workers/
- React Helmet: https://github.com/staylor/react-helmet-async

# Admin Module Pattern

## When to Use

When a business module needs a management dashboard (CRUD tables, stats, settings).

## Prerequisites

Module MUST depend on `permission`:

```typescript
dependsOn: ['permission']
```

## File Structure

```
template/src/server/module-{name}/
├── routes/
│   └── {name}-routes.ts          # Client routes (apiRoutes)
├── routes/
│   └── admin-{name}-routes.ts    # Admin routes (adminRoutes)
├── services/
│   └── {name}-service.ts
└── module.ts

template/src/admin/
├── pages/{Name}Page.tsx           # Admin page (Ant Design)
└── stores/{name}AdminStore.ts     # Admin Zustand store (optional)
```

## Admin Routes

**File**: `template/src/server/module-{name}/routes/admin-{name}-routes.ts`

```typescript
import { createRoute } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import { z } from '@hono/zod-openapi'
import { successResponse, errorResponse } from '@server/utils/route-helpers'

const listAdminRoute = createRoute({
  method: 'get',
  path: '/admin/{names}',
  responses: {
    200: successResponse(z.array({Name}Schema), 'List {names} for admin'),
    403: errorResponse('Forbidden'),
  },
})

export const adminRoutes = new OpenAPIHono()
  .openapi(listAdminRoute, async c => {
    // Admin-only logic
  })
```

## Admin Page

**File**: `template/src/admin/pages/{Name}Page.tsx`

Uses **Ant Design** (not Tailwind). Example:

```typescript
import { Table, Button, Space, Modal, Form, Input, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

export const {Name}Page: React.FC = () => {
  // Use adminApiRoutes via apiClient
  // Ant Design Table + Form pattern
}
```

## Manifest Declaration

```typescript
{
  routes: {
    client: { mountPath: '/api', file: 'routes/{name}-routes.ts', exportName: 'apiRoutes' },
    admin: [{ mountPath: '/api', file: 'routes/admin-{name}-routes.ts', exportName: 'adminRoutes' }],
  },
  adminPages: [{
    name: '{Name}Page',
    path: '/{names}',
    requiredPermission: 'manage_{names}',
  }],
}
```

## Generator Updates

When adding admin routes, check:

1. `src/generators/route-registry.ts` — admin route aggregation
2. `src/generators/admin-app.ts` — admin page routing
3. `src/generators/middleware-index.ts` — auth middleware for admin

## Rules

1. Admin pages use Ant Design, client pages use Tailwind
2. Admin store is separate from client store
3. Never import `@client/` components in admin pages
4. Admin API routes go through auth middleware (applied in `app.ts`)

# ModuleManifest Fields Reference

## Full Interface

```typescript
interface ModuleManifest {
  // === Identity ===
  name: string // Unique kebab-case identifier
  description: string // Human-readable description
  category: 'core' | 'communication' | 'business' | 'system'
  dependsOn: string[] // Other module names required

  // === Routes ===
  routes: {
    client?: {
      // Routes mounted under /api for client SPA
      mountPath: string // Usually '/api'
      file: string // Relative to module dir: 'routes/xxx-routes.ts'
      exportName: string // Usually 'apiRoutes'
    }
    admin?: {
      // Routes mounted under /api for admin SPA
      mountPath: string // Usually '/api'
      file: string
      exportName: string
    }
    standalone?: {
      // Routes with custom mount path
      mountPath: string // e.g. '/api/chat'
      file: string
      exportName: string
    }
  }

  // === Shared Layer ===
  sharedSchemas: string[] // Module names in shared/modules/

  // === Client Layer ===
  clientPages: Array<{
    name: string // Component name: 'TodoPage'
    path: string // Route path: '/todos'
  }>
  clientStores: string[] // Store names without 'Store' suffix: ['todo']

  // === Admin Layer ===
  adminPages: Array<{
    name: string
    path: string
    requiredPermission?: string // Permission required to view
  }>

  // === Database ===
  dbSchemas: {
    files: string[] // Schema file names: ['todos']
  }

  // === Middleware ===
  providesMiddleware: Array<{
    name: string // Middleware name
    file: string // File path
    exportName: string // Exported function name
    applyTo: string // Glob pattern: '/api/admin/*'
  }>

  // === Real-time ===
  hasSSE: boolean
  hasWebSocket: boolean
}
```

## Field Requirements by Category

### core modules (e.g. todos)

```typescript
{
  category: 'core',
  dependsOn: [],
  routes: { client: { ... } },
  hasSSE: false,
  hasWebSocket: false,
}
```

### communication modules (e.g. chat, notifications)

```typescript
{
  category: 'communication',
  dependsOn: [],
  routes: { standalone: { ... } },  // or client
  hasSSE: true,                      // notifications
  hasWebSocket: true,                // chat
}
```

### business modules (e.g. order, ticket)

```typescript
{
  category: 'business',
  dependsOn: ['permission'],
  routes: { client: { ... } },
  adminPages: [{ name: 'OrderPage', path: '/orders', requiredPermission: 'manage_orders' }],
}
```

### system modules (e.g. permission, captcha, file)

```typescript
{
  category: 'system',
  dependsOn: [],
  routes: { standalone: { ... } },
  providesMiddleware: [{ name: 'auth', file: '...', exportName: 'authMiddleware', applyTo: '/api/*' }],
}
```

## Validation Rules

The `npm run validate:modules` command checks:

1. `name` is unique across all manifests
2. `dependsOn` modules exist
3. `category` is one of the 4 allowed values
4. Route files exist at declared paths
5. Export names exist in route files
6. DB schema files exist
7. No circular dependencies in `dependsOn` graph

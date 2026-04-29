# Production Readiness Fixes — TDD Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 12 production-readiness issues following strict TDD (Red → Green → Refactor) with regression-safe tests.

**Architecture:** All fixes are in the `template/` directory. Tests live alongside source in `__tests__/` folders. Each task writes the failing test FIRST, verifies it fails, implements the fix, then verifies it passes.

**Tech Stack:** Vitest + @testing-library/react for client tests, Vitest + Hono test client for server tests.

**TDD Discipline:**

- Step 1: Write failing test → verify RED
- Step 2: Write minimal implementation → verify GREEN
- Step 3: Commit
- Never skip the "verify it fails" step

**Test Commands:**

- Single test: `cd template && npx vitest run <file> --reporter=verbose`
- All tests: `cd template && npm run test`
- Typecheck: `cd template && npx tsc --noEmit`
- Lint: `cd template && npx eslint 'src/**/*.{ts,tsx}' --max-warnings=0`

---

## Batch A: Quick Fixes (TDD Easy) — Tasks 1-4

### Task 1: Frontend 404 Catch-All Route

**Why:** `App.tsx` has no `<Route path="*">` — invalid URLs render a blank page.

**Files:**

- Modify: `template/src/client/App.tsx:50-68` (add catch-all route)
- Create: `template/src/client/pages/NotFoundPage.tsx`
- Modify: `template/src/client/components/__tests__/App.test.tsx`

**Step 1: Write the failing test**

Add to `template/src/client/components/__tests__/App.test.tsx`:

```tsx
import { MemoryRouter } from 'react-router-dom'

it('should render 404 page for unknown routes', () => {
  render(
    <MemoryRouter initialEntries={['/nonexistent-page']}>
      <App />
    </MemoryRouter>
  )
  expect(screen.getByText(/not found/i)).toBeInTheDocument()
})
```

**Step 2: Run test to verify it fails**

Run: `cd template && npx vitest run src/client/components/__tests__/App.test.tsx --reporter=verbose`
Expected: FAIL — no element with text "not found"

**Step 3: Create NotFoundPage component**

Create `template/src/client/pages/NotFoundPage.tsx`:

```tsx
export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <h1 className="text-6xl font-bold text-gray-300">404</h1>
      <p className="mt-4 text-lg text-gray-600">Page not found</p>
      <a
        href="/"
        className="mt-6 px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Go Home
      </a>
    </div>
  )
}
```

**Step 4: Add catch-all route to App.tsx**

In `template/src/client/App.tsx`, add after the last `<Route>` inside `<Routes>`:

```tsx
<Route path="*" element={<NotFoundPage />} />
```

Add lazy import alongside others:

```tsx
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'))
```

**Step 5: Run test to verify it passes**

Run: `cd template && npx vitest run src/client/components/__tests__/App.test.tsx --reporter=verbose`
Expected: PASS

**Step 6: Commit**

```bash
git add template/src/client/App.tsx template/src/client/pages/NotFoundPage.tsx template/src/client/components/__tests__/App.test.tsx
git commit -m "feat(client): 添加 404 页面和 catch-all 路由"
```

---

### Task 2: Fix Mixed Language in AuthButton

**Why:** `AuthButton.tsx` uses Chinese (`已登录`, `退出`, `登录`) while the rest of the app is English.

**Files:**

- Modify: `template/src/client/components/AuthButton.tsx:22,27,38`
- Modify: `template/src/client/components/__tests__/AuthButton.test.tsx:67-68,87-89`

**Step 1: Write the failing test**

In `template/src/client/components/__tests__/AuthButton.test.tsx`, update assertions to expect English:

```tsx
// In the "when authenticated" test:
expect(screen.getByText('Logged in')).toBeInTheDocument()
expect(screen.getByText('Logout')).toBeInTheDocument()

// In the "when not authenticated" test:
expect(screen.getByText('Login')).toBeInTheDocument()
```

**Step 2: Run test to verify it fails**

Run: `cd template && npx vitest run src/client/components/__tests__/AuthButton.test.tsx --reporter=verbose`
Expected: FAIL — `Unable to find an element with the text: Logged in`

**Step 3: Fix AuthButton.tsx**

Replace Chinese strings in `template/src/client/components/AuthButton.tsx`:

- Line 22: `已登录` → `Logged in`
- Line 27: `退出` → `Logout`
- Line 38: `登录` → `Login`

**Step 4: Run test to verify it passes**

Run: `cd template && npx vitest run src/client/components/__tests__/AuthButton.test.tsx --reporter=verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add template/src/client/components/AuthButton.tsx template/src/client/components/__tests__/AuthButton.test.tsx
git commit -m "fix(client): authbutton 中文字符串改为英文"
```

---

### Task 3: Health Endpoint Returns 503 When DB Is Unreachable

**Why:** `app.ts` health endpoint returns 200 even when DB connection fails.

**Files:**

- Modify: `template/src/server/app.ts:168-176` (health endpoint)
- Create: `template/src/server/__tests__/health-endpoint.test.ts`

**Step 1: Write the failing test**

Create `template/src/server/__tests__/health-endpoint.test.ts`:

```ts
/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createApp } from '../app'

describe('Health Endpoint', () => {
  describe('GET /health', () => {
    it('should return 200 with db connected', async () => {
      const app = createApp()
      const res = await app.request('/health')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.status).toBe('ok')
    })

    it('should return 503 when database is unreachable', async () => {
      vi.doMock('../db', () => ({
        getDb: vi.fn().mockRejectedValue(new Error('Connection refused')),
        getRawClient: vi.fn().mockResolvedValue(null),
      }))

      const { createApp: createAppMock } = await import('../app')
      const app = createAppMock()
      const res = await app.request('/health')
      expect(res.status).toBe(503)
      const data = await res.json()
      expect(data.status).toBe('error')
      expect(data.database).toBe('disconnected')

      vi.doUnmock('../db')
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd template && npx vitest run src/server/__tests__/health-endpoint.test.ts --reporter=verbose`
Expected: FAIL — the 503 test receives 200

**Step 3: Fix health endpoint in app.ts**

Find the health endpoint route handler in `template/src/server/app.ts` (around line 168-176). Update to:

```ts
app.get('/health', async c => {
  try {
    const db = await getDb()
    if (db) {
      return c.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() })
    }
    return c.json(
      { status: 'error', database: 'disconnected', timestamp: new Date().toISOString() },
      503
    )
  } catch {
    return c.json(
      { status: 'error', database: 'disconnected', timestamp: new Date().toISOString() },
      503
    )
  }
})
```

**Step 4: Run test to verify it passes**

Run: `cd template && npx vitest run src/server/__tests__/health-endpoint.test.ts --reporter=verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add template/src/server/app.ts template/src/server/__tests__/health-endpoint.test.ts
git commit -m "fix(server): health endpoint 返回 503 当数据库不可达"
```

---

### Task 4: Dockerfile — Copy drizzle/ + Non-Root User + Fix Healthcheck

**Why:** Production image missing migration files, runs as root, healthcheck uses curl not available in Alpine.

**Files:**

- Modify: `template/Dockerfile`

**Step 1: Write the failing test (infra check script)**

Create `template/scripts/check-dockerfile.sh`:

```bash
#!/bin/bash
# Verify Dockerfile production readiness
DOCKERFILE="Dockerfile"

# Check 1: drizzle/ is copied
if ! grep -q "drizzle" "$DOCKERFILE"; then
  echo "FAIL: drizzle/ not copied in Dockerfile"
  exit 1
fi

# Check 2: Non-root user
if ! grep -q "USER " "$DOCKERFILE"; then
  echo "FAIL: No USER directive (runs as root)"
  exit 1
fi

# Check 3: Healthcheck uses wget (Alpine native) not curl
if grep -q "curl" "$DOCKERFILE"; then
  echo "FAIL: Healthcheck uses curl, should use wget for Alpine"
  exit 1
fi

echo "PASS: All Dockerfile checks passed"
```

Run: `cd template && bash scripts/check-dockerfile.sh`
Expected: FAIL on all 3 checks

**Step 2: Fix Dockerfile**

Update `template/Dockerfile`:

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/drizzle ./drizzle

RUN mkdir -p /app/data && \
    adduser -D -g '' appuser && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 3010

CMD ["node", "dist/server/node.js"]

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -q --spider http://localhost:3010/health || exit 1
```

**Step 3: Run check script**

Run: `cd template && bash scripts/check-dockerfile.sh`
Expected: PASS

**Step 4: Commit**

```bash
git add template/Dockerfile template/scripts/check-dockerfile.sh
git commit -m "fix(docker): 复制 drizzle/、非 root 用户、wget 健康检查"
```

---

## Batch B: Medium Fixes — Tasks 5-8

### Task 5: Graceful Shutdown with DB Close + WS Drain

**Why:** Server kills in-flight requests and doesn't close DB/WebSocket on SIGTERM.

**Files:**

- Modify: `template/src/server/entries/node.ts:175-182`
- Create: `template/src/server/__tests__/graceful-shutdown.test.ts`

**Step 1: Write the failing test**

Create `template/src/server/__tests__/graceful-shutdown.test.ts`:

```ts
/**
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest'

describe('Graceful Shutdown', () => {
  it('should call closeDb during shutdown', async () => {
    const closeDbSpy = vi.fn()
    vi.doMock('../db', () => ({
      getDb: vi.fn().mockResolvedValue({}),
      closeDb: closeDbSpy,
      getRawClient: vi.fn().mockResolvedValue(null),
    }))

    const { createShutdownHandler } = await import('../entries/shutdown')
    const mockServer = { close: vi.fn(cb => cb?.()) }
    const shutdown = createShutdownHandler(mockServer, closeDbSpy)
    await shutdown()

    expect(closeDbSpy).toHaveBeenCalled()
    expect(mockServer.close).toHaveBeenCalled()
    vi.doUnmock('../db')
  })

  it('should wait for drain timeout before force exit', async () => {
    vi.useFakeTimers()
    const closeDbSpy = vi.fn()
    const mockServer = { close: vi.fn() }
    const { createShutdownHandler } = await import('../entries/shutdown')
    const shutdown = createShutdownHandler(mockServer, closeDbSpy)
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)

    shutdown()
    expect(exitSpy).not.toHaveBeenCalled()

    vi.advanceTimersByTime(10000)
    expect(exitSpy).toHaveBeenCalledWith(0)

    vi.useRealTimers()
    exitSpy.mockRestore()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd template && npx vitest run src/server/__tests__/graceful-shutdown.test.ts --reporter=verbose`
Expected: FAIL — `createShutdownHandler` doesn't exist

**Step 3: Extract shutdown logic**

Create `template/src/server/entries/shutdown.ts`:

```ts
import { logger } from '../utils/logger'

const log = logger.api()

const DRAIN_TIMEOUT_MS = 10_000

export function createShutdownHandler(
  server: { close: (callback?: () => void) => void },
  closeDb: () => Promise<void>
) {
  let isShuttingDown = false

  return async () => {
    if (isShuttingDown) return
    isShuttingDown = true

    log.info({}, 'Shutting down gracefully...')

    const forceExitTimer = setTimeout(() => {
      log.warn({}, 'Forcing exit after drain timeout')
      process.exit(1)
    }, DRAIN_TIMEOUT_MS)

    server.close(() => {
      log.info({}, 'All connections closed')
    })

    try {
      await closeDb()
      log.info({}, 'Database connection closed')
    } catch (err) {
      log.error({ err }, 'Error closing database')
    }

    clearTimeout(forceExitTimer)
    process.exit(0)
  }
}
```

**Step 4: Update node.ts to use extracted handler**

In `template/src/server/entries/node.ts`, replace lines 175-182:

```ts
import { createShutdownHandler } from './shutdown'
import { closeDb } from '../db'

const shutdown = createShutdownHandler(server, closeDb)
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
```

**Step 5: Run test to verify it passes**

Run: `cd template && npx vitest run src/server/__tests__/graceful-shutdown.test.ts --reporter=verbose`
Expected: PASS

**Step 6: Commit**

```bash
git add template/src/server/entries/shutdown.ts template/src/server/entries/node.ts template/src/server/__tests__/graceful-shutdown.test.ts
git commit -m "fix(server): 优雅关闭 — 关闭 db、drain 连接、超时强制退出"
```

---

### Task 6: Surface Notification Store Errors to UI

**Why:** `notificationStore.ts` silently catches errors with `console.error` — users never see failures.

**Files:**

- Modify: `template/src/client/stores/notificationStore.ts` (multiple catch blocks)
- Modify: `template/src/client/stores/__tests__/notificationStore.test.ts`

**Step 1: Write the failing test**

Add to `template/src/client/stores/__tests__/notificationStore.test.ts`:

```ts
it('should set error state when fetchNotifications fails', async () => {
  const { api } = await import('../../services/apiClient')
  vi.spyOn(api, 'request').mockRejectedValue(new Error('Network error'))

  const { fetchNotifications } = useNotificationStore.getState()
  await fetchNotifications()

  const state = useNotificationStore.getState()
  expect(state.error).toBeTruthy()
  expect(state.error).toContain('Network error')
})
```

**Step 2: Run test to verify it fails**

Run: `cd template && npx vitest run src/client/stores/__tests__/notificationStore.test.ts --reporter=verbose`
Expected: FAIL — `state.error` is undefined/null

**Step 3: Fix notificationStore.ts**

In `template/src/client/stores/notificationStore.ts`, add `error: null` to the initial state, then update each catch block:

```ts
// Before:
} catch (error) {
  console.error('Failed to fetch notifications:', error)
}

// After:
} catch (error) {
  set({ error: error instanceof Error ? error.message : 'Unknown error' })
}
```

Apply this pattern to: `fetchNotifications`, `markAsRead`, `markAllAsRead`, `deleteNotification`.

**Step 4: Run test to verify it passes**

Run: `cd template && npx vitest run src/client/stores/__tests__/notificationStore.test.ts --reporter=verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add template/src/client/stores/notificationStore.ts template/src/client/stores/__tests__/notificationStore.test.ts
git commit -m "fix(client): notification store 错误状态暴露到 ui"
```

---

### Task 7: Batch Permission Checks (Fix N+1)

**Why:** `auth.ts` loops through permissions one-by-one, making N DB queries instead of 1.

**Files:**

- Modify: `template/src/server/middleware/auth.ts:185-201`
- Modify: `template/src/server/module-permission/services/permission-service-impl.ts`
- Create/Modify: `template/src/server/module-permission/__tests__/permission-batch.test.ts`

**Step 1: Write the failing test**

Create `template/src/server/module-permission/__tests__/permission-batch.test.ts`:

```ts
/**
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest'
import { permissionService } from '../services/permission-service-impl'

describe('Permission Batch Check', () => {
  it('hasPermissionBatch should return results for multiple permissions in single query', async () => {
    const result = await permissionService.hasPermissionBatch('super-admin-1', [
      'order:view',
      'order:create',
      'user:delete',
    ])
    expect(result).toEqual({
      'order:view': true,
      'order:create': true,
      'user:delete': true,
    })
  })

  it('hasPermissionBatch should return false for permissions user does not have', async () => {
    const result = await permissionService.hasPermissionBatch('customer-service-1', [
      'order:view',
      'user:delete',
    ])
    expect(result['order:view']).toBe(true)
    expect(result['user:delete']).toBe(false)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd template && npx vitest run src/server/module-permission/__tests__/permission-batch.test.ts --reporter=verbose`
Expected: FAIL — `hasPermissionBatch` doesn't exist

**Step 3: Implement hasPermissionBatch**

In `template/src/server/module-permission/services/permission-service-impl.ts`, add:

```ts
async hasPermissionBatch(userId: string, permissionCodes: string[]): Promise<Record<string, boolean>> {
  const userPerms = await this.getUserPermissions(
    (await this.getUserRoleCode(userId)) || ''
  )
  const permSet = new Set(userPerms.map(p => p.code))
  const result: Record<string, boolean> = {}
  for (const code of permissionCodes) {
    result[code] = permSet.has(code)
  }
  return result
}
```

**Step 4: Update auth middleware to use batch check**

In `template/src/server/middleware/auth.ts`, find the permission check loop and replace:

```ts
// Before: N+1 loop
for (const requiredPermission of options.requiredPermissions) {
  const hasPermission = await permissionService.hasPermission(user.id, requiredPermission)
  if (!hasPermission) { ... }
}

// After: Single batch call
const permissionResults = await permissionService.hasPermissionBatch(
  user.id,
  options.requiredPermissions
)
for (const requiredPermission of options.requiredPermissions) {
  if (!permissionResults[requiredPermission]) { ... }
}
```

**Step 5: Run tests**

Run: `cd template && npx vitest run src/server/module-permission/__tests__/permission-batch.test.ts --reporter=verbose`
Expected: PASS

Run: `cd template && npx vitest run src/server/middleware/__tests__/auth.test.ts --reporter=verbose`
Expected: PASS (existing tests should still work)

**Step 6: Commit**

```bash
git add template/src/server/module-permission/services/permission-service-impl.ts template/src/server/middleware/auth.ts template/src/server/module-permission/__tests__/permission-batch.test.ts
git commit -m "fix(server): 权限检查从 n+1 循环改为批量查询"
```

---

### Task 8: Standardize Delete Return Types

**Why:** 4 mock services return different shapes on delete: `{ message }`, `{ success, message }`, `boolean`.

**Files:**

- Modify: `template/src/server/module-order/services/order-service.ts`
- Modify: `template/src/server/module-ticket/services/ticket-service.ts`
- Modify: `template/src/server/module-dispute/services/dispute-service.ts`
- Modify: `template/src/server/module-content/services/content-service.ts`
- Modify: corresponding route files
- Modify: corresponding test files

**Step 1: Write the failing test**

Add to each service test file, a shared assertion pattern:

```ts
it('delete should return { success: true, data: { id } }', async () => {
  // create then delete
  const created = await service.create({ ... })
  const result = await service.delete(created.id)
  expect(result).toEqual({ success: true, data: { id: created.id } })
})
```

**Step 2: Run test to verify it fails**

Run: `cd template && npx vitest run src/server/module-order/__tests__/ --reporter=verbose`
Expected: FAIL — delete returns `{ message: string }` instead

**Step 3: Fix all delete methods**

In each service, change the delete return to:

```ts
return { success: true, data: { id } }
```

Update route handlers to pass through the new shape.

**Step 4: Run tests**

Run: `cd template && npx vitest run src/server/module-order/__tests__/ src/server/module-ticket/__tests__/ src/server/module-dispute/__tests__/ src/server/module-content/__tests__/ --reporter=verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add template/src/server/module-order/ template/src/server/module-ticket/ template/src/server/module-dispute/ template/src/server/module-content/
git commit -m "fix(server): 统一 delete 返回类型为 { success, data: { id } }"
```

---

## Batch C: Hard Fixes — Tasks 9-12

> **技术选型已确认：**
>
> - JWT: `hono/jwt`（Hono 内置，零依赖，Node + CF Workers 双端通用）
> - 密码哈希: `bcryptjs`（纯 JS 实现，双端通用）
> - 租户 ID: JWT claim（payload 带 `tenantId`）
> - Rate Limit: 抽象 store 接口，内存默认 + Redis 可选

### Task 9: Replace console.\* with Structured Logger (34 instances)

**Scope:** 34 `console.log/warn/error` calls in `template/src/server/`
**Allowed exceptions:** `cloudflare.ts`、`RealtimeDO.ts`（CF Workers 无 pino）、CLI 工具代码

**Approach:**

1. Write ESLint rule `no-console-in-server` that fails on `console.log/warn/error` outside allowed files
2. Run lint → see 34 failures
3. Replace each with `const log = logger.api()` / `logger.db()` etc.
4. Run lint → 0 failures

**Test:** The lint rule IS the test.

### Task 10: Rate Limiter — Abstract Store + Redis Optional

**Scope:** `template/src/server/middleware/rate-limit.ts`
**Approach:**

1. Extract `RateLimitStore` interface: `increment(key) → { count, resetTime }`
2. Keep `MemoryRateLimitStore` as default
3. Add `RedisRateLimitStore` (optional, behind `REDIS_URL` env var)
4. Factory function `createRateLimitStore()` auto-selects based on env

**Test:** Mock `RateLimitStore` interface, verify both paths.

### Task 11: Tenant Isolation via JWT Claim

**Scope:** New middleware + all tenant-scoped routes
**Approach:**

1. JWT payload includes `tenantId` field
2. New `tenantContextMiddleware` extracts `tenantId` from JWT → `c.set('tenantId', tenantId)`
3. All tenant-scoped routes check `c.get('tenantId')` matches requested resource
4. Cross-tenant access → 403

**Test:** Create User A in Tenant X, User B in Tenant Y. Request Y's data as A → 403.

### Task 12: Production Auth (hono/jwt + bcryptjs)

**Scope:** `template/src/server/middleware/auth.ts`, `template/src/server/module-ops/services/admin-service.ts`
**Approach:**

1. Add `bcryptjs` dependency
2. Login endpoint: verify password with `bcrypt.compare()` → sign JWT with `hono/jwt`
3. JWT payload: `{ sub: userId, role, tenantId, exp }`
4. Auth middleware: verify JWT with `hono/jwt` → extract user
5. Dev tokens still work in `NODE_ENV=development` for DX
6. Token expiry: 24h access token

**Test:** Login with correct/incorrect password. Verify JWT on subsequent request. Verify expired JWT rejected.

---

## Execution Order

| Batch          | Tasks | Duration Estimate | Dependencies                                          |
| -------------- | ----- | ----------------- | ----------------------------------------------------- |
| **A** (Quick)  | 1-4   | ~30 min           | None                                                  |
| **B** (Medium) | 5-8   | ~60 min           | None                                                  |
| **C** (Hard)   | 9-12  | ~3-4 hours        | Task 12 (Auth) should be done before Task 11 (Tenant) |

**Recommended execution:** Batch A → Batch B → Batch C (12 → 9 → 10 → 11)

---

## Verification Checklist

After all tasks in a batch:

- [ ] `cd template && npx tsc --noEmit` — 0 errors
- [ ] `cd template && npx eslint 'src/**/*.{ts,tsx}' --max-warnings=0` — 0 warnings
- [ ] `cd template && npm run test` — all pass
- [ ] `npm run typecheck` (root) — 0 errors
- [ ] Commit messages lowercase (commitlint rule)
- [ ] No `--no-verify` on commits (husky must pass)

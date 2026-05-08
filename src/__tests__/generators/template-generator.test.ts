import { describe, it, expect, beforeAll } from 'vitest'
import { loadManifests, loadPresets, resolvePreset } from '../../generators/template-generator'
import { getExcludePatterns } from '../../generators/file-filter'
import { generateSharedModulesIndex } from '../../generators/shared-modules-index'
import { generateSharedSchemasIndex } from '../../generators/shared-schemas-index'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEMPLATE_DIR = path.join(__dirname, '../../../template')

describe('template-generator', () => {
  describe('loadManifests', () => {
    let manifests: Map<string, any>

    beforeAll(async () => {
      manifests = await loadManifests(TEMPLATE_DIR)
    })

    it('should discover all 11 modules', () => {
      expect(manifests.size).toBe(11)
    })

    it('should parse standalone modules correctly', () => {
      const todos = manifests.get('todos')
      expect(todos).toBeDefined()
      expect(todos.name).toBe('todos')
      expect(todos.category).toBe('core')
      expect(todos.dependsOn).toEqual([])
      expect(todos.routes.client).toBeDefined()
      expect(todos.routes.client.exportName).toBe('apiRoutes')
    })

    it('should parse module dependencies', () => {
      const admin = manifests.get('admin')
      expect(admin).toBeDefined()
      expect(admin.dependsOn).toContain('permission')
      expect(admin.dependsOn).toContain('notifications')
    })

    it('should parse modules with multiple admin routes', () => {
      const permission = manifests.get('permission')
      expect(permission).toBeDefined()
      expect(permission.routes.admin).toBeDefined()
      expect(permission.routes.admin.length).toBe(3)
    })

    it('should parse SSE flag', () => {
      const notifications = manifests.get('notifications')
      expect(notifications.hasSSE).toBe(true)
    })

    it('should parse WebSocket flag', () => {
      const chat = manifests.get('chat')
      expect(chat.hasWebSocket).toBe(true)
    })

    it('should parse db schemas', () => {
      const todos = manifests.get('todos')
      expect(todos.dbSchemas).toBeDefined()
      expect(todos.dbSchemas.files).toContain('todos')
      expect(todos.dbSchemas.files).toContain('todo-attachments')
      expect(todos.dbSchemas.hasSeed).toBe(true)
    })

    it('should parse client pages', () => {
      const todos = manifests.get('todos')
      expect(todos.clientPages).toBeDefined()
      expect(todos.clientPages.length).toBeGreaterThan(0)
      expect(todos.clientPages[0].name).toBe('TodoPage')
    })

    it('should parse admin pages with isPublic flag', () => {
      const admin = manifests.get('admin')
      const loginPage = admin.adminPages.find((p: any) => p.name === 'LoginPage')
      expect(loginPage).toBeDefined()
      expect(loginPage.isPublic).toBe(true)
    })

    it('should parse standalone routes', () => {
      const file = manifests.get('file')
      expect(file.routes.standalone).toBeDefined()
      expect(file.routes.standalone.mountPath).toBe('/files')
    })

    it('should parse providesMiddleware', () => {
      const permission = manifests.get('permission')
      expect(permission.providesMiddleware).toBeDefined()
      expect(permission.providesMiddleware.length).toBe(2)
    })

    it('should parse shared schemas path', () => {
      const file = manifests.get('file')
      expect(file.sharedSchemas).toBeDefined()
      expect(file.sharedSchemas.path).toBe('files')
    })

    it('should parse client stores', () => {
      const todos = manifests.get('todos')
      expect(todos.clientStores).toContain('todoStore')
    })

    it('should handle modules without dbSchemas', () => {
      const captcha = manifests.get('captcha')
      expect(captcha.dbSchemas).toBeUndefined()
    })

    it('should handle modules without client routes', () => {
      const permission = manifests.get('permission')
      expect(permission.routes.client).toBeUndefined()
    })
  })

  describe('loadPresets', () => {
    let presets: any[]

    beforeAll(async () => {
      presets = await loadPresets(TEMPLATE_DIR)
    })

    it('should load all 4 presets', () => {
      expect(presets.length).toBe(4)
    })

    it('should parse preset IDs', () => {
      const ids = presets.map(p => p.id)
      expect(ids).toContain('fullstack-admin')
      expect(ids).toContain('todo-app')
      expect(ids).toContain('minimal')
    })

    it('should parse preset modules arrays', () => {
      const minimal = presets.find(p => p.id === 'minimal')
      expect(minimal.modules).toEqual(['todos'])
    })

    it('should handle comments in modules array without breaking', () => {
      const fullstack = presets.find(p => p.id === 'fullstack-admin')
      expect(fullstack.modules.length).toBe(11)
      expect(fullstack.modules).toContain('todos')
      expect(fullstack.modules).toContain('order')
    })
  })

  describe('resolvePreset', () => {
    it('should expand transitive dependencies', async () => {
      const allManifests = await loadManifests(TEMPLATE_DIR)
      const presets = await loadPresets(TEMPLATE_DIR)

      const todoApp = presets.find(p => p.id === 'todo-app')!
      const resolved = resolvePreset(todoApp, allManifests)
      expect(resolved.modules.size).toBe(3)
    })

    it('should include all modules for fullstack-admin', async () => {
      const allManifests = await loadManifests(TEMPLATE_DIR)
      const presets = await loadPresets(TEMPLATE_DIR)

      const fullstack = presets.find(p => p.id === 'fullstack-admin')!
      const resolved = resolvePreset(fullstack, allManifests)
      expect(resolved.modules.size).toBe(11)
    })

    it('should compute hasAdmin correctly', async () => {
      const allManifests = await loadManifests(TEMPLATE_DIR)
      const presets = await loadPresets(TEMPLATE_DIR)

      const minimal = presets.find(p => p.id === 'minimal')!
      const resolved = resolvePreset(minimal, allManifests)
      expect(resolved.hasAdmin).toBe(false)

      const fullstack = presets.find(p => p.id === 'fullstack-admin')!
      const resolvedFull = resolvePreset(fullstack, allManifests)
      expect(resolvedFull.hasAdmin).toBe(true)
    })

    it('should compute hasSSE and hasWebSocket correctly', async () => {
      const allManifests = await loadManifests(TEMPLATE_DIR)
      const presets = await loadPresets(TEMPLATE_DIR)

      const minimal = presets.find(p => p.id === 'minimal')!
      const resolved = resolvePreset(minimal, allManifests)
      expect(resolved.hasSSE).toBe(false)
      expect(resolved.hasWebSocket).toBe(false)

      const todoApp = presets.find(p => p.id === 'todo-app')!
      const resolvedTodo = resolvePreset(todoApp, allManifests)
      expect(resolvedTodo.hasSSE).toBe(true)
      expect(resolvedTodo.hasWebSocket).toBe(true)
    })
  })

  describe('getExcludePatterns (manifest-driven)', () => {
    let allManifests: Map<string, any>
    let presets: any[]

    beforeAll(async () => {
      allManifests = await loadManifests(TEMPLATE_DIR)
      presets = await loadPresets(TEMPLATE_DIR)
    })

    it('should exclude all non-minimal modules for minimal preset', () => {
      const minimal = presets.find(p => p.id === 'minimal')
      const resolved = resolvePreset(minimal, allManifests)
      const excludes = getExcludePatterns(resolved, allManifests)

      expect(excludes).toContain('src/server/module-chat')
      expect(excludes).toContain('src/server/module-admin')
      expect(excludes).toContain('src/server/module-permission')
      expect(excludes).toContain('src/shared/modules/chat')
      expect(excludes).toContain('src/shared/modules/admin')
      expect(excludes).not.toContain('src/server/module-todos')
      expect(excludes).not.toContain('src/shared/modules/todos')
    })

    it('should exclude admin dir for non-admin presets', () => {
      const todoApp = presets.find(p => p.id === 'todo-app')
      const resolved = resolvePreset(todoApp, allManifests)
      const excludes = getExcludePatterns(resolved, allManifests)

      expect(excludes).toContain('src/admin')
      expect(excludes).toContain('admin.html')
    })

    it('should derive middleware exclusions from manifests', () => {
      const minimal = presets.find(p => p.id === 'minimal')
      const resolved = resolvePreset(minimal, allManifests)
      const excludes = getExcludePatterns(resolved, allManifests)

      expect(excludes).toContain('src/server/middleware/permission.ts')
      expect(excludes).toContain('src/server/middleware/audit-log.ts')
      expect(excludes).toContain('src/server/middleware/captcha.ts')
    })

    it('should derive DB schema exclusions from manifests', () => {
      const minimal = presets.find(p => p.id === 'minimal')
      const resolved = resolvePreset(minimal, allManifests)
      const excludes = getExcludePatterns(resolved, allManifests)

      expect(excludes).toContain('src/server/db/schema/orders.ts')
      expect(excludes).toContain('src/server/db/schema/contents.ts')
      expect(excludes).not.toContain('src/server/db/schema/todos.ts')
    })

    it('should exclude client pages from excluded modules', () => {
      const minimal = presets.find(p => p.id === 'minimal')
      const resolved = resolvePreset(minimal, allManifests)
      const excludes = getExcludePatterns(resolved, allManifests)

      expect(excludes).toContain('src/client/pages/WebSocketPage.tsx')
      expect(excludes).toContain('src/client/pages/NotificationPage.tsx')
      expect(excludes).not.toContain('src/client/pages/TodoPage.tsx')
    })

    it('should exclude client stores from excluded modules', () => {
      const minimal = presets.find(p => p.id === 'minimal')
      const resolved = resolvePreset(minimal, allManifests)
      const excludes = getExcludePatterns(resolved, allManifests)

      expect(excludes).toContain('src/client/stores/chatWSStore.ts')
      expect(excludes).toContain('src/client/stores/notificationStore.ts')
      expect(excludes).toContain('src/client/stores/authStore.ts')
      expect(excludes).not.toContain('src/client/stores/todoStore.ts')
    })

    it('should exclude admin pages from excluded modules', () => {
      const minimal = presets.find(p => p.id === 'minimal')
      const resolved = resolvePreset(minimal, allManifests)
      const excludes = getExcludePatterns(resolved, allManifests)

      expect(excludes).toContain('src/admin/pages/DashboardPage.tsx')
      expect(excludes).toContain('src/admin/pages/OrdersPage.tsx')
      expect(excludes).toContain('src/admin/pages/ContentPage.tsx')
    })

    it('should exclude permission additional shared paths (role, audit)', () => {
      const todoApp = presets.find(p => p.id === 'todo-app')
      const resolved = resolvePreset(todoApp, allManifests)
      const excludes = getExcludePatterns(resolved, allManifests)

      expect(excludes).toContain('src/shared/modules/role')
      expect(excludes).toContain('src/shared/modules/audit')
    })

    it('should exclude notification CLI modules and tests', () => {
      const minimal = presets.find(p => p.id === 'minimal')
      const resolved = resolvePreset(minimal, allManifests)
      const excludes = getExcludePatterns(resolved, allManifests)

      expect(excludes).toContain('src/cli/modules/notification')
      expect(excludes).toContain('src/client/pages/__tests__/NotificationPage.test.tsx')
    })

    it('should exclude chat test files', () => {
      const minimal = presets.find(p => p.id === 'minimal')
      const resolved = resolvePreset(minimal, allManifests)
      const excludes = getExcludePatterns(resolved, allManifests)

      expect(excludes).toContain('src/client/pages/__tests__/WebSocketPage.test.tsx')
    })

    it('should have no duplicate exclude patterns', () => {
      const minimal = presets.find(p => p.id === 'minimal')
      const resolved = resolvePreset(minimal, allManifests)
      const excludes = getExcludePatterns(resolved, allManifests)

      const unique = new Set(excludes)
      expect(unique.size).toBe(excludes.length)
    })

    it('should not exclude anything for fullstack-admin preset', () => {
      const fullstack = presets.find(p => p.id === 'fullstack-admin')
      const resolved = resolvePreset(fullstack, allManifests)
      const excludes = getExcludePatterns(resolved, allManifests)

      expect(excludes).not.toContain('src/admin')
      expect(excludes).not.toContain('src/server/module-todos')
      expect(excludes).not.toContain('src/shared/modules/chat')
    })
  })

  describe('generateSharedModulesIndex (manifest-driven)', () => {
    let allManifests: Map<string, any>
    let presets: any[]

    beforeAll(async () => {
      allManifests = await loadManifests(TEMPLATE_DIR)
      presets = await loadPresets(TEMPLATE_DIR)
    })

    it('should generate explicit exports for minimal preset (todos only)', () => {
      const minimal = presets.find(p => p.id === 'minimal')
      const resolved = resolvePreset(minimal, allManifests)
      const content = generateSharedModulesIndex(resolved)

      expect(content).toContain('export {')
      expect(content).toContain('TodoSchema')
      expect(content).toContain("from './todos'")
      expect(content).not.toContain("from './chat'")
      expect(content).not.toContain("from './admin'")
    })

    it('should generate explicit exports for todo-app preset', () => {
      const todoApp = presets.find(p => p.id === 'todo-app')
      const resolved = resolvePreset(todoApp, allManifests)
      const content = generateSharedModulesIndex(resolved)

      expect(content).toContain("from './todos'")
      expect(content).toContain("from './chat'")
      expect(content).toContain("from './notifications'")
      expect(content).not.toContain("from './admin'")
    })

    it('should generate explicit exports for all modules in fullstack-admin', () => {
      const fullstack = presets.find(p => p.id === 'fullstack-admin')
      const resolved = resolvePreset(fullstack, allManifests)
      const content = generateSharedModulesIndex(resolved)

      expect(content).toContain("from './todos'")
      expect(content).toContain("from './chat'")
      expect(content).toContain("from './notifications'")
      expect(content).toContain("from './files'")
      expect(content).toContain("from './admin'")
      expect(content).toContain("from './permission'")
    })
  })

  describe('generateSharedSchemasIndex (manifest-driven)', () => {
    let allManifests: Map<string, any>
    let presets: any[]

    beforeAll(async () => {
      allManifests = await loadManifests(TEMPLATE_DIR)
      presets = await loadPresets(TEMPLATE_DIR)
    })

    it('should include core exports always', () => {
      const minimal = presets.find(p => p.id === 'minimal')
      const resolved = resolvePreset(minimal, allManifests)
      const content = generateSharedSchemasIndex(resolved)

      expect(content).toContain('WSClient')
      expect(content).toContain('ApiSuccessSchema')
      expect(content).toContain('createWSClient')
    })

    it('should export todos module schemas for minimal preset', () => {
      const minimal = presets.find(p => p.id === 'minimal')
      const resolved = resolvePreset(minimal, allManifests)
      const content = generateSharedSchemasIndex(resolved)

      expect(content).toContain("from '../modules/todos'")
      expect(content).not.toContain("from '../modules/chat'")
    })

    it('should export correct modules for todo-app preset', () => {
      const todoApp = presets.find(p => p.id === 'todo-app')
      const resolved = resolvePreset(todoApp, allManifests)
      const content = generateSharedSchemasIndex(resolved)

      expect(content).toContain("from '../modules/todos'")
      expect(content).toContain("from '../modules/chat'")
      expect(content).toContain("from '../modules/notifications'")
      expect(content).not.toContain("from '../modules/files'")
    })
  })
})

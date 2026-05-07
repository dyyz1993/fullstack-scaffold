import { describe, it, expect, beforeAll } from 'vitest'
import {
  loadManifests,
  loadPresets,
  resolvePreset,
} from '../../generators/template-generator'
import { generateRouteRegistry } from '../../generators/route-registry'
import { generateClientApp } from '../../generators/client-app'
import { generateClientNavigation } from '../../generators/client-navigation'
import { generateAdminApp } from '../../generators/admin-app'
import { generateDbSchemaBarrel } from '../../generators/db-schema-barrel'
import { filterPackageJson } from '../../generators/package-json'
import { generateViteConfig } from '../../generators/vite-config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEMPLATE_DIR = path.join(__dirname, '../../../template')

function getPreset(id: string, manifests: Map<string, any>, presets: any[]) {
  return resolvePreset(
    presets.find((p) => p.id === id)!,
    manifests,
  )
}

describe('code generators', () => {
  let allManifests: Map<string, any>
  let presets: any[]

  beforeAll(async () => {
    allManifests = await loadManifests(TEMPLATE_DIR)
    presets = await loadPresets(TEMPLATE_DIR)
  })

  describe('generateRouteRegistry', () => {
    it('minimal: generates client route with todos only', () => {
      const resolved = getPreset('minimal', allManifests, presets)
      const content = generateRouteRegistry(resolved)

      expect(content).toContain("import { apiRoutes }")
      expect(content).toContain("from './module-todos/routes/todos-routes'")
      expect(content).toContain(".route('/api', apiRoutes)")
      expect(content).toContain('export type ClientApiRoutes')
      expect(content).toContain('export type AdminApiRoutes')
      expect(content).toContain('// No admin modules selected')
    })

    it('todo-app: generates 3 client routes', () => {
      const resolved = getPreset('todo-app', allManifests, presets)
      const content = generateRouteRegistry(resolved)

      expect(content).toContain("from './module-todos/routes/todos-routes'")
      expect(content).toContain("from './module-chat/routes/chat-routes'")
      expect(content).toContain(
        "from './module-notifications/routes/notification-routes'",
      )
      expect(content).toContain('// No admin modules selected')
    })

    it('fullstack: generates client + admin routes', () => {
      const resolved = getPreset('fullstack-admin', allManifests, presets)
      const content = generateRouteRegistry(resolved)

      expect(content).toContain("from './module-todos/routes/todos-routes'")
      expect(content).toContain("from './module-chat/routes/chat-routes'")
      expect(content).toContain(
        "from './module-admin/routes/admin-routes'",
      )
      expect(content).toContain('// admin API routes')
      expect(content).toContain('adminApiRoutes')
    })

    it('exports type aliases', () => {
      const resolved = getPreset('minimal', allManifests, presets)
      const content = generateRouteRegistry(resolved)

      expect(content).toContain(
        'export type ClientApiRoutes = typeof clientApiRoutes',
      )
      expect(content).toContain(
        'export type AdminApiRoutes = typeof adminApiRoutes',
      )
    })

    it('includes rate limit middleware', () => {
      const resolved = getPreset('minimal', allManifests, presets)
      const content = generateRouteRegistry(resolved)

      expect(content).toContain("import { rateLimitMiddleware }")
      expect(content).toContain('const apiRateLimit = rateLimitMiddleware')
      expect(content).toContain(".use('*', apiRateLimit)")
    })
  })

  describe('generateClientApp', () => {
    it('minimal: 1 page with default redirect', () => {
      const resolved = getPreset('minimal', allManifests, presets)
      const content = generateClientApp(resolved)

      expect(content).toContain("import { TodoPage } from './pages/TodoPage'")
      expect(content).toContain(
        '<Route path="/" element={<Navigate to="/todos" replace />}',
      )
      expect(content).toContain('<Route path="/todos" element={<TodoPage />} />')
      expect(content).not.toContain('NotificationPage')
      expect(content).not.toContain('WebSocketPage')
    })

    it('todo-app: 3 pages with correct imports', () => {
      const resolved = getPreset('todo-app', allManifests, presets)
      const content = generateClientApp(resolved)

      expect(content).toContain("import { TodoPage }")
      expect(content).toContain("import { WebSocketPage }")
      expect(content).toContain("import { NotificationPage }")
      expect(content).toContain('<Route path="/todos"')
      expect(content).toContain('<Route path="/websocket"')
      expect(content).toContain('<Route path="/notifications"')
    })

    it('uses BrowserRouter and Layout', () => {
      const resolved = getPreset('minimal', allManifests, presets)
      const content = generateClientApp(resolved)

      expect(content).toContain('BrowserRouter')
      expect(content).toContain('<Layout>')
      expect(content).toContain('<Routes>')
    })
  })

  describe('generateClientNavigation', () => {
    it('maps pages to RouteKey and routes object', () => {
      const resolved = getPreset('minimal', allManifests, presets)
      const content = generateClientNavigation(resolved)

      expect(content).toContain("type RouteKey = 'todos'")
      expect(content).toContain(
        "todos: { label: 'Todo List', icon: CheckCircle, path: '/todos' }",
      )
    })

    it('includes AuthButton for admin presets', () => {
      const resolved = getPreset('fullstack-admin', allManifests, presets)
      const content = generateClientNavigation(resolved)

      expect(content).toContain("import { AuthButton } from './AuthButton'")
      expect(content).toContain('<AuthButton />')
    })

    it('excludes AuthButton for non-admin presets', () => {
      const resolved = getPreset('minimal', allManifests, presets)
      const content = generateClientNavigation(resolved)

      expect(content).not.toContain('AuthButton')
    })

    it('todo-app: has 3 route keys', () => {
      const resolved = getPreset('todo-app', allManifests, presets)
      const content = generateClientNavigation(resolved)

      expect(content).toContain("'todos'")
      expect(content).toContain("'websocket'")
      expect(content).toContain("'notifications'")
      expect(content).toContain("from 'lucide-react'")
    })

    it('includes brand and github link', () => {
      const resolved = getPreset('minimal', allManifests, presets)
      const content = generateClientNavigation(resolved)

      expect(content).toContain('<Rocket size={24} />')
      expect(content).toContain('Biomimic App')
      expect(content).toContain('<Github size={18} />')
    })
  })

  describe('generateAdminApp', () => {
    it('returns null for minimal preset', () => {
      const resolved = getPreset('minimal', allManifests, presets)
      expect(generateAdminApp(resolved)).toBeNull()
    })

    it('returns null for todo-app preset', () => {
      const resolved = getPreset('todo-app', allManifests, presets)
      expect(generateAdminApp(resolved)).toBeNull()
    })

    it('generates full admin app for fullstack preset', () => {
      const resolved = getPreset('fullstack-admin', allManifests, presets)
      const content = generateAdminApp(resolved)

      expect(content).not.toBeNull()
      expect(content).toContain('ConfigProvider')
      expect(content).toContain('BrowserRouter basename="/admin"')
      expect(content).toContain('ProtectedRoute')
    })

    it('separates public and protected routes', () => {
      const resolved = getPreset('fullstack-admin', allManifests, presets)
      const content = generateAdminApp(resolved)!

      expect(content).toContain('LoginPage')
      expect(content).toContain('<ProtectedRoute>')
    })

    it('includes CaptchaModal when captcha module is present', () => {
      const resolved = getPreset('fullstack-admin', allManifests, presets)
      const content = generateAdminApp(resolved)

      expect(content).toContain('CaptchaModal')
      expect(content).toContain('<CaptchaModal />')
    })

    it('uses antd ConfigProvider with theme', () => {
      const resolved = getPreset('fullstack-admin', allManifests, presets)
      const content = generateAdminApp(resolved)!

      expect(content).toContain("import { ConfigProvider } from 'antd'")
      expect(content).toContain('colorPrimary')
    })
  })

  describe('generateDbSchemaBarrel', () => {
    it('minimal: only todos + todo-attachments', () => {
      const resolved = getPreset('minimal', allManifests, presets)
      const content = generateDbSchemaBarrel(resolved)

      expect(content).toContain("export * from './todos'")
      expect(content).toContain("export * from './todo-attachments'")
      expect(content).not.toContain("export * from './orders'")
      expect(content).not.toContain("export * from './users'")
    })

    it('fullstack: includes all schemas', () => {
      const resolved = getPreset('fullstack-admin', allManifests, presets)
      const content = generateDbSchemaBarrel(resolved)

      expect(content).toContain("export * from './todos'")
      expect(content).toContain("export * from './todo-attachments'")
      expect(content).toContain("export * from './orders'")
      expect(content).toContain("export * from './tickets'")
      expect(content).toContain("export * from './disputes'")
      expect(content).toContain("export * from './contents'")
      expect(content).toContain("export * from './permissions'")
      expect(content).toContain("export * from './roles'")
      expect(content).toContain("export * from './user-roles'")
    })
  })

  describe('filterPackageJson', () => {
    const basePkg = {
      name: 'test-app',
      dependencies: {
        react: '^18.0.0',
        antd: '^5.0.0',
        bcryptjs: '^2.4.3',
        commander: '^12.0.0',
        'lodash-es': '^4.17.21',
        chalk: '^5.3.0',
        mysql2: '^3.0.0',
      },
      devDependencies: {
        vitest: '^4.0.0',
        '@testing-library/user-event': '^14.0.0',
      },
    }

    it('removes antd/bcryptjs for minimal preset', () => {
      const resolved = getPreset('minimal', allManifests, presets)
      const result = filterPackageJson(basePkg, resolved)
      const deps = result.dependencies as Record<string, string>

      expect(deps).not.toHaveProperty('antd')
      expect(deps).not.toHaveProperty('bcryptjs')
    })

    it('removes unused packages (lodash-es, chalk, mysql2)', () => {
      const resolved = getPreset('fullstack-admin', allManifests, presets)
      const result = filterPackageJson(basePkg, resolved)
      const deps = result.dependencies as Record<string, string>

      expect(deps).not.toHaveProperty('lodash-es')
      expect(deps).not.toHaveProperty('chalk')
      expect(deps).not.toHaveProperty('mysql2')
    })

    it('keeps antd/bcryptjs for fullstack preset', () => {
      const resolved = getPreset('fullstack-admin', allManifests, presets)
      const result = filterPackageJson(basePkg, resolved)
      const deps = result.dependencies as Record<string, string>

      expect(deps).toHaveProperty('antd')
      expect(deps).toHaveProperty('bcryptjs')
    })

    it('removes commander for non-admin presets', () => {
      const resolved = getPreset('minimal', allManifests, presets)
      const result = filterPackageJson(basePkg, resolved)
      const deps = result.dependencies as Record<string, string>

      expect(deps).not.toHaveProperty('commander')
    })

    it('removes @testing-library/user-event for non-admin presets', () => {
      const resolved = getPreset('minimal', allManifests, presets)
      const result = filterPackageJson(basePkg, resolved)
      const devDeps = result.devDependencies as Record<string, string>

      expect(devDeps).not.toHaveProperty('@testing-library/user-event')
    })

    it('keeps @testing-library/user-event for fullstack preset', () => {
      const resolved = getPreset('fullstack-admin', allManifests, presets)
      const result = filterPackageJson(basePkg, resolved)
      const devDeps = result.devDependencies as Record<string, string>

      expect(devDeps).toHaveProperty('@testing-library/user-event')
    })

    it('preserves non-filtered fields', () => {
      const resolved = getPreset('minimal', allManifests, presets)
      const result = filterPackageJson(basePkg, resolved)

      expect(result.name).toBe('test-app')
    })

    it('keeps react dependency for all presets', () => {
      const resolved = getPreset('minimal', allManifests, presets)
      const result = filterPackageJson(basePkg, resolved)
      const deps = result.dependencies as Record<string, string>

      expect(deps).toHaveProperty('react')
    })
  })

  describe('generateViteConfig', () => {
    it('removes admin.html entry for non-admin presets', () => {
      const resolved = getPreset('minimal', allManifests, presets)
      const content = generateViteConfig(resolved, TEMPLATE_DIR)

      expect(content).toContain("main: path.resolve(__dirname, 'index.html')")
      expect(content).not.toContain("admin: path.resolve")
      expect(content).not.toContain("'admin.html'")
    })

    it('keeps admin.html for fullstack preset', () => {
      const resolved = getPreset('fullstack-admin', allManifests, presets)
      const content = generateViteConfig(resolved, TEMPLATE_DIR)

      expect(content).toContain("main: path.resolve(__dirname, 'index.html')")
      expect(content).toContain("admin: path.resolve(__dirname, 'admin.html')")
    })

    it('preserves resolve aliases for all presets', () => {
      const resolved = getPreset('minimal', allManifests, presets)
      const content = generateViteConfig(resolved, TEMPLATE_DIR)

      expect(content).toContain("'@shared'")
      expect(content).toContain("'@client'")
      expect(content).toContain("'@server'")
    })

    it('todo-app preset removes admin.html', () => {
      const resolved = getPreset('todo-app', allManifests, presets)
      const content = generateViteConfig(resolved, TEMPLATE_DIR)

      expect(content).not.toContain("admin: path.resolve")
    })
  })
})

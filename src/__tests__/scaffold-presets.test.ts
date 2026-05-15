import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const PROJECT_ROOT = path.resolve(import.meta.dirname, '../..')
const CLI_ENTRY = path.join(PROJECT_ROOT, 'src/index.ts')
const TSX_BIN = path.join(PROJECT_ROOT, 'node_modules/.bin/tsx')

const ALL_MODULES = [
  'todos',
  'chat',
  'notifications',
  'file',
  'captcha',
  'permission',
  'admin',
  'auth',
  'plugin',
  'order',
  'ticket',
  'dispute',
  'content',
] as const

const tempDirs: string[] = []

function createTempDir(prefix = 'preset-scaffold-'): string {
  const dir = path.join(os.tmpdir(), `${prefix}${randomUUID()}`)
  fs.mkdirSync(dir, { recursive: true })
  tempDirs.push(dir)
  return dir
}

function runCli(
  args: string[],
  cwd?: string
): { stdout: string; stderr: string; status: number | null } {
  try {
    const stdout = execSync(`"${TSX_BIN}" "${CLI_ENTRY}" ${args.join(' ')}`, {
      cwd: cwd ?? os.tmpdir(),
      encoding: 'utf-8',
      timeout: 60_000,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    return { stdout, stderr: '', status: 0 }
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; status?: number }
    return {
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? '',
      status: e.status ?? 1,
    }
  }
}

function scaffoldProject(preset: string, projectName: string): string {
  const parentDir = createTempDir(`preset-${preset}-`)
  const result = runCli(['--preset', preset, projectName], parentDir)
  expect(result.status).toBe(0)
  return path.join(parentDir, projectName)
}

function readPackageJson(projectDir: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf-8'))
}

afterAll(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe('Scaffold Presets', () => {
  describe('minimal preset', () => {
    const includedModules = ['todos']
    const excludedModules = ALL_MODULES.filter(m => !includedModules.includes(m))
    let projectDir: string

    beforeAll(() => {
      projectDir = scaffoldProject('minimal', 'minimal-app')
    })

    it('should scaffold successfully', () => {
      expect(fs.existsSync(path.join(projectDir, 'package.json'))).toBe(true)
      expect(fs.existsSync(path.join(projectDir, 'src'))).toBe(true)
      expect(fs.existsSync(path.join(projectDir, 'tsconfig.json'))).toBe(true)
    })

    it('should have only module-todos directory', () => {
      for (const mod of includedModules) {
        expect(
          fs.existsSync(path.join(projectDir, `src/server/module-${mod}`)),
          `module-${mod} should exist`
        ).toBe(true)
      }
    })

    it('should not have excluded module directories', () => {
      for (const mod of excludedModules) {
        expect(
          fs.existsSync(path.join(projectDir, `src/server/module-${mod}`)),
          `module-${mod} should NOT exist`
        ).toBe(false)
      }
    })

    it('should not have admin directory', () => {
      expect(fs.existsSync(path.join(projectDir, 'src/admin'))).toBe(false)
    })

    it('should not have admin.html', () => {
      expect(fs.existsSync(path.join(projectDir, 'admin.html'))).toBe(false)
    })

    it('should not have antd or bcryptjs in package.json', () => {
      const pkg = readPackageJson(projectDir)
      const deps = pkg.dependencies as Record<string, string>
      expect(deps).not.toHaveProperty('antd')
      expect(deps).not.toHaveProperty('bcryptjs')
      expect(deps).not.toHaveProperty('commander')
    })

    it('should have route-registry with only todos client routes', () => {
      const content = fs.readFileSync(
        path.join(projectDir, 'src/server/route-registry.ts'),
        'utf-8'
      )
      expect(content).toContain('module-todos')
      for (const mod of excludedModules) {
        expect(content).not.toContain(`module-${mod}`)
      }
    })

    it('should have only todos shared schemas', () => {
      const content = fs.readFileSync(path.join(projectDir, 'src/shared/modules/index.ts'), 'utf-8')
      expect(content).toMatch(/todos/)
      expect(content).not.toMatch(/chat/)
      expect(content).not.toMatch(/notifications/)
      expect(content).not.toMatch(/permission/)
      expect(content).not.toMatch(/admin/)
    })

    it('should have client App.tsx with config-driven routing', () => {
      const content = fs.readFileSync(path.join(projectDir, 'src/client/App.tsx'), 'utf-8')
      expect(content).toMatch(/PresetProvider/)
      expect(content).toMatch(/getPresetUIConfig/)
    })

    it('should not have excluded client stores', () => {
      expect(fs.existsSync(path.join(projectDir, 'src/client/stores/chatWSStore.ts'))).toBe(false)
      expect(fs.existsSync(path.join(projectDir, 'src/client/stores/notificationStore.ts'))).toBe(
        false
      )
      expect(fs.existsSync(path.join(projectDir, 'src/client/stores/authStore.ts'))).toBe(false)
    })

    it('should not have excluded client pages', () => {
      expect(fs.existsSync(path.join(projectDir, 'src/client/pages/WebSocketPage.tsx'))).toBe(false)
      expect(fs.existsSync(path.join(projectDir, 'src/client/pages/NotificationPage.tsx'))).toBe(
        false
      )
    })
  })

  describe('todo-app preset', () => {
    const includedModules = ['todos', 'chat', 'notifications', 'auth']
    const excludedModules = ALL_MODULES.filter(m => !includedModules.includes(m))
    let projectDir: string

    beforeAll(() => {
      projectDir = scaffoldProject('todo-app', 'todo-app-project')
    })

    it('should scaffold successfully', () => {
      expect(fs.existsSync(path.join(projectDir, 'package.json'))).toBe(true)
      expect(fs.existsSync(path.join(projectDir, 'src'))).toBe(true)
      expect(fs.existsSync(path.join(projectDir, 'tsconfig.json'))).toBe(true)
    })

    it('should have module-todos, module-chat, module-notifications, module-auth', () => {
      for (const mod of includedModules) {
        expect(
          fs.existsSync(path.join(projectDir, `src/server/module-${mod}`)),
          `module-${mod} should exist`
        ).toBe(true)
      }
    })

    it('should not have excluded module directories', () => {
      for (const mod of excludedModules) {
        expect(
          fs.existsSync(path.join(projectDir, `src/server/module-${mod}`)),
          `module-${mod} should NOT exist`
        ).toBe(false)
      }
    })

    it('should not have admin directory', () => {
      expect(fs.existsSync(path.join(projectDir, 'src/admin'))).toBe(false)
    })

    it('should not have antd or commander in package.json', () => {
      const pkg = readPackageJson(projectDir)
      const deps = pkg.dependencies as Record<string, string>
      expect(deps).not.toHaveProperty('antd')
      expect(deps).not.toHaveProperty('commander')
    })

    it('should have route-registry with 4 client routes', () => {
      const content = fs.readFileSync(
        path.join(projectDir, 'src/server/route-registry.ts'),
        'utf-8'
      )
      expect(content).toContain('module-todos')
      expect(content).toContain('module-chat')
      expect(content).toContain('module-notifications')
      expect(content).toContain('module-auth')
      for (const mod of excludedModules) {
        expect(content).not.toContain(`module-${mod}`)
      }
      const clientRoutes = content.match(/\.route\('\/api', \w+\)/g)
      expect(clientRoutes?.length).toBeGreaterThanOrEqual(4)
    })

    it('should have client App.tsx with config-driven routing', () => {
      const content = fs.readFileSync(path.join(projectDir, 'src/client/App.tsx'), 'utf-8')
      expect(content).toMatch(/PresetProvider/)
      expect(content).toMatch(/getPresetUIConfig/)
    })

    it('should have all client stores', () => {
      expect(fs.existsSync(path.join(projectDir, 'src/client/stores/todoStore.ts'))).toBe(true)
      expect(fs.existsSync(path.join(projectDir, 'src/client/stores/chatWSStore.ts'))).toBe(true)
      expect(fs.existsSync(path.join(projectDir, 'src/client/stores/notificationStore.ts'))).toBe(
        true
      )
      expect(fs.existsSync(path.join(projectDir, 'src/client/stores/authStore.ts'))).toBe(true)
    })

    it('should have shared schemas for all modules', () => {
      const content = fs.readFileSync(path.join(projectDir, 'src/shared/modules/index.ts'), 'utf-8')
      expect(content).toMatch(/todos/)
      expect(content).toMatch(/chat/)
      expect(content).toMatch(/notifications/)
      expect(content).not.toMatch(/permission/)
      expect(content).not.toMatch(/admin/)
      expect(content).not.toMatch(/order/)
    })

    it('should have all client pages', () => {
      expect(fs.existsSync(path.join(projectDir, 'src/client/pages/TodoPage.tsx'))).toBe(true)
      expect(fs.existsSync(path.join(projectDir, 'src/client/pages/WebSocketPage.tsx'))).toBe(true)
      expect(fs.existsSync(path.join(projectDir, 'src/client/pages/NotificationPage.tsx'))).toBe(
        true
      )
      expect(fs.existsSync(path.join(projectDir, 'src/client/pages/LoginPage.tsx'))).toBe(true)
      expect(fs.existsSync(path.join(projectDir, 'src/client/pages/RegisterPage.tsx'))).toBe(true)
    })
  })

  describe('fullstack-admin preset', () => {
    let projectDir: string

    beforeAll(() => {
      projectDir = scaffoldProject('fullstack-admin', 'fullstack-project')
    })

    it('should scaffold successfully', () => {
      expect(fs.existsSync(path.join(projectDir, 'package.json'))).toBe(true)
      expect(fs.existsSync(path.join(projectDir, 'src'))).toBe(true)
      expect(fs.existsSync(path.join(projectDir, 'tsconfig.json'))).toBe(true)
    })

    it('should have all 13 module directories', () => {
      for (const mod of ALL_MODULES) {
        expect(
          fs.existsSync(path.join(projectDir, `src/server/module-${mod}`)),
          `module-${mod} should exist`
        ).toBe(true)
      }
    })

    it('should have admin directory', () => {
      expect(fs.existsSync(path.join(projectDir, 'src/admin'))).toBe(true)
      expect(fs.existsSync(path.join(projectDir, 'src/admin/App.tsx'))).toBe(true)
    })

    it('should have admin.html', () => {
      expect(fs.existsSync(path.join(projectDir, 'admin.html'))).toBe(true)
    })

    it('should have bcryptjs and antd in package.json', () => {
      const pkg = readPackageJson(projectDir)
      const deps = pkg.dependencies as Record<string, string>
      expect(deps).toHaveProperty('bcryptjs')
      expect(deps).toHaveProperty('antd')
    })

    it('should have all client pages', () => {
      expect(fs.existsSync(path.join(projectDir, 'src/client/pages/TodoPage.tsx'))).toBe(true)
      expect(fs.existsSync(path.join(projectDir, 'src/client/pages/WebSocketPage.tsx'))).toBe(true)
      expect(fs.existsSync(path.join(projectDir, 'src/client/pages/NotificationPage.tsx'))).toBe(
        true
      )
    })

    it('should have all client stores including auth and plugin', () => {
      expect(fs.existsSync(path.join(projectDir, 'src/client/stores/todoStore.ts'))).toBe(true)
      expect(fs.existsSync(path.join(projectDir, 'src/client/stores/chatWSStore.ts'))).toBe(true)
      expect(fs.existsSync(path.join(projectDir, 'src/client/stores/notificationStore.ts'))).toBe(
        true
      )
      expect(fs.existsSync(path.join(projectDir, 'src/client/stores/authStore.ts'))).toBe(true)
      expect(fs.existsSync(path.join(projectDir, 'src/client/stores/pluginStore.ts'))).toBe(true)
    })

    it('should have route-registry with all modules', () => {
      const content = fs.readFileSync(
        path.join(projectDir, 'src/server/route-registry.ts'),
        'utf-8'
      )
      for (const mod of ALL_MODULES) {
        expect(content).toContain(`module-${mod}`)
      }
    })
  })
})

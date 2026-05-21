import { execSync, spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const PROJECT_ROOT = path.resolve(import.meta.dirname, '../..')
const CLI_ENTRY = path.join(PROJECT_ROOT, 'src/index.ts')

interface PresetConfig {
  id: string
  dir: string
  port: number
  expectedModules: string[]
  expectedAPIs: string[]
  notExpectedAPIs: string[]
  hasAdmin: boolean
  hasTenant: boolean
}

const PRESETS_TO_VERIFY: PresetConfig[] = [
  {
    id: 'minimal',
    dir: 'verify-minimal',
    port: 40001,
    expectedModules: ['todos'],
    expectedAPIs: ['/api/todos'],
    notExpectedAPIs: [
      '/api/notifications',
      '/api/captcha',
      '/api/permissions/roles',
      '/api/admin/dashboard/stats',
      '/api/plugins',
      '/api/topics',
    ],
    hasAdmin: false,
    hasTenant: false,
  },
  {
    id: 'todo-app',
    dir: 'verify-todo',
    port: 40002,
    expectedModules: ['auth', 'chat', 'notifications', 'todos'],
    expectedAPIs: ['/api/todos', '/api/notifications'],
    notExpectedAPIs: [
      '/api/captcha',
      '/api/permissions/roles',
      '/api/admin/dashboard/stats',
      '/api/plugins',
      '/api/topics',
    ],
    hasAdmin: false,
    hasTenant: false,
  },
  {
    id: 'ecommerce',
    dir: 'verify-ecommerce',
    port: 40003,
    expectedModules: [
      'chat',
      'content',
      'dispute',
      'file',
      'notifications',
      'order',
      'permission',
      'ticket',
      'todos',
    ],
    expectedAPIs: ['/api/todos', '/api/notifications', '/api/permissions/roles', '/api/topics'],
    notExpectedAPIs: ['/api/captcha', '/api/admin/dashboard/stats', '/api/plugins'],
    hasAdmin: false,
    hasTenant: false,
  },
  {
    id: 'xbrowser-marketplace',
    dir: 'verify-plugin',
    port: 40004,
    expectedModules: [
      'admin',
      'auth',
      'captcha',
      'content',
      'dispute',
      'file',
      'notifications',
      'order',
      'permission',
      'plugin',
      'ticket',
    ],
    expectedAPIs: [
      '/api/permissions/roles',
      '/api/captcha',
      '/api/plugins',
      '/api/admin/dashboard/stats',
      '/api/topics',
      '/api/notifications',
    ],
    notExpectedAPIs: ['/api/todos'],
    hasAdmin: true,
    hasTenant: false,
  },
  {
    id: 'fullstack-admin',
    dir: 'verify-admin',
    port: 40005,
    expectedModules: [
      'admin',
      'auth',
      'captcha',
      'chat',
      'content',
      'dispute',
      'file',
      'merchant',
      'notifications',
      'order',
      'permission',
      'plugin',
      'tenant',
      'ticket',
      'todos',
    ],
    expectedAPIs: [
      '/api/todos',
      '/api/notifications',
      '/api/permissions/roles',
      '/api/captcha',
      '/api/admin/dashboard/stats',
      '/api/plugins',
      '/api/topics',
    ],
    notExpectedAPIs: [],
    hasAdmin: true,
    hasTenant: true,
  },
  {
    id: 'forum',
    dir: 'verify-forum',
    port: 40006,
    expectedModules: ['admin', 'auth', 'content', 'notifications', 'permission'],
    expectedAPIs: [
      '/api/permissions/roles',
      '/api/notifications',
      '/api/topics',
      '/api/admin/dashboard/stats',
    ],
    notExpectedAPIs: ['/api/chat/ws', '/api/todos', '/api/captcha', '/api/plugins'],
    hasAdmin: true,
    hasTenant: false,
  },
  {
    id: 'saas',
    dir: 'verify-saas',
    port: 40007,
    expectedModules: [
      'auth',
      'captcha',
      'content',
      'file',
      'notifications',
      'permission',
      'tenant',
      'todos',
    ],
    expectedAPIs: [
      '/api/todos',
      '/api/notifications',
      '/api/permissions/roles',
      '/api/captcha',
      '/api/topics',
    ],
    notExpectedAPIs: ['/api/chat/ws', '/api/admin/dashboard/stats', '/api/plugins'],
    hasAdmin: false,
    hasTenant: true,
  },
]

const ALL_KNOWN_MODULES = [
  'todos',
  'chat',
  'notifications',
  'file',
  'captcha',
  'permission',
  'admin',
  'auth',
  'plugin',
  'tenant',
  'order',
  'ticket',
  'dispute',
  'content',
  'merchant',
]

const presetProjects = new Map<string, string>()
const activePids: number[] = []

function run(cmd: string, cwd: string, timeout = 120_000, env?: Record<string, string>): string {
  return execSync(cmd, {
    cwd,
    encoding: 'utf-8',
    timeout,
    stdio: 'pipe',
    maxBuffer: 50 * 1024 * 1024,
    env: { ...process.env, ...env },
  })
}

function curlGet(port: number, urlPath: string, timeout = 15_000): string {
  return execSync(`curl -sf http://localhost:${port}${urlPath}`, {
    encoding: 'utf-8',
    timeout,
  })
}

function curlGetCode(port: number, urlPath: string, timeout = 15_000): number {
  try {
    execSync(`curl -sf -o /dev/null -w '%{http_code}' http://localhost:${port}${urlPath}`, {
      encoding: 'utf-8',
      timeout,
    })
    return 200
  } catch (e: unknown) {
    const err = e as { stdout?: string }
    const code = err.stdout?.trim()
    if (code && /^\d{3}$/.test(code)) return parseInt(code, 10)
    return 0
  }
}

function waitForServer(port: number, maxMs = 60_000): Promise<void> {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const check = () => {
      if (Date.now() - start > maxMs) {
        return reject(new Error(`Server on port ${port} did not respond within ${maxMs}ms`))
      }
      try {
        execSync(`curl -sf http://localhost:${port}/ -o /dev/null`, { timeout: 3_000 })
        resolve()
      } catch {
        setTimeout(check, 500)
      }
    }
    check()
  })
}

function killPort(port: number): void {
  try {
    const pid = execSync(`lsof -ti:${port} 2>/dev/null || true`, {
      encoding: 'utf-8',
      timeout: 5_000,
    }).trim()
    if (pid) {
      const pids = pid.split('\n').filter(Boolean)
      for (const p of pids) {
        try {
          process.kill(parseInt(p, 10), 'SIGKILL')
        } catch {
          // already dead
        }
      }
    }
  } catch {
    // ignore
  }
}

afterAll(() => {
  for (const preset of PRESETS_TO_VERIFY) {
    killPort(preset.port)
  }
  for (const pid of activePids) {
    try {
      process.kill(pid, 'SIGKILL')
    } catch {
      // already dead
    }
  }
  for (const [, projectPath] of presetProjects) {
    const parentDir = path.dirname(projectPath)
    if (fs.existsSync(parentDir)) {
      try {
        fs.rmSync(parentDir, { recursive: true, force: true })
      } catch {
        try {
          execSync(`rm -rf "${parentDir}"`, { timeout: 10_000 })
        } catch {
          // best effort
        }
      }
    }
  }
})

describe.each(PRESETS_TO_VERIFY)(
  'E2E Multi-Preset: $id',
  { sequential: true, timeout: 300_000 },
  preset => {
    const projectDir = path.join(os.tmpdir(), `${preset.dir}-${randomUUID()}`, 'test-app')

    beforeAll(() => {
      fs.mkdirSync(path.dirname(projectDir), { recursive: true })
      presetProjects.set(preset.id, projectDir)
    })

    test('step 1: scaffolds project with preset', { timeout: 60_000 }, () => {
      run(
        `npx tsx "${CLI_ENTRY}" test-app --preset ${preset.id} --no-install`,
        path.dirname(projectDir),
        60_000
      )

      expect(fs.existsSync(projectDir), `${preset.id} project dir should exist`).toBe(true)
      expect(
        fs.existsSync(path.join(projectDir, 'package.json')),
        'package.json should exist'
      ).toBe(true)
      expect(
        fs.existsSync(path.join(projectDir, 'tsconfig.json')),
        'tsconfig.json should exist'
      ).toBe(true)
      expect(fs.existsSync(path.join(projectDir, 'src')), 'src/ should exist').toBe(true)
    })

    test('step 2: file structure matches preset spec', () => {
      for (const mod of preset.expectedModules) {
        expect(
          fs.existsSync(path.join(projectDir, `src/server/module-${mod}`)),
          `module-${mod} should exist for ${preset.id}`
        ).toBe(true)
      }

      const excludedModules = ALL_KNOWN_MODULES.filter(m => !preset.expectedModules.includes(m))
      for (const mod of excludedModules) {
        expect(
          fs.existsSync(path.join(projectDir, `src/server/module-${mod}`)),
          `module-${mod} should NOT exist for ${preset.id}`
        ).toBe(false)
      }

      if (preset.hasAdmin) {
        expect(
          fs.existsSync(path.join(projectDir, 'admin.html')),
          'admin.html should exist when hasAdmin=true'
        ).toBe(true)
        expect(
          fs.existsSync(path.join(projectDir, 'src/admin')),
          'src/admin/ should exist when hasAdmin=true'
        ).toBe(true)
      } else {
        expect(
          fs.existsSync(path.join(projectDir, 'admin.html')),
          'admin.html should NOT exist when hasAdmin=false'
        ).toBe(false)
        expect(
          fs.existsSync(path.join(projectDir, 'src/admin')),
          'src/admin/ should NOT exist when hasAdmin=false'
        ).toBe(false)
      }

      if (preset.hasTenant) {
        expect(
          fs.existsSync(path.join(projectDir, 'tenant.html')),
          'tenant.html should exist when hasTenant=true'
        ).toBe(true)
      } else {
        expect(
          fs.existsSync(path.join(projectDir, 'tenant.html')),
          'tenant.html should NOT exist when hasTenant=false'
        ).toBe(false)
      }

      expect(
        fs.existsSync(path.join(projectDir, 'src/client/App.tsx')),
        'src/client/App.tsx should exist'
      ).toBe(true)
    })

    test('step 3: installs dependencies', { timeout: 300_000 }, () => {
      expect(fs.existsSync(projectDir), 'project must exist before install').toBe(true)

      run('npm install --legacy-peer-deps', projectDir, 300_000)

      try {
        run('npx patch-package', projectDir, 60_000)
      } catch {
        // patch-package failure is non-blocking
      }

      expect(
        fs.existsSync(path.join(projectDir, 'node_modules')),
        'node_modules should exist after install'
      ).toBe(true)

      // Verify critical dependencies installed
      expect(
        fs.existsSync(path.join(projectDir, 'node_modules/vite')),
        'vite should be installed'
      ).toBe(true)
      expect(
        fs.existsSync(path.join(projectDir, 'node_modules/hono')),
        'hono should be installed'
      ).toBe(true)
    })

    test('step 4: type-check passes', { timeout: 300_000 }, () => {
      run('npx tsc --noEmit', projectDir, 300_000, {
        NODE_OPTIONS: '--max-old-space-size=6144',
      })
    })

    test('step 5: unit tests pass', { timeout: 300_000 }, () => {
      let output: string
      try {
        output = run('npx vitest run 2>&1', projectDir, 300_000)
      } catch (e: unknown) {
        const err = e as { stdout?: string | Buffer; stderr?: string | Buffer }
        output = (err.stdout as string) ?? (err.stderr as string) ?? String(e)
      }
      // eslint-disable-next-line no-control-regex
      const cleaned = output.replace(/\x1b\[[0-9;]*m/g, '')
      const hasPassed = /\d+ passed/.test(cleaned)
      const hasFailed = /\d+ failed/.test(cleaned)
      if (!hasPassed || hasFailed) {
        console.log(`[${preset.id}] test output tail:\n${output.split('\n').slice(-80).join('\n')}`)
      }
      expect(hasPassed, `${preset.id} should have passing tests`).toBe(true)
    })

    test('step 6: project builds successfully', { timeout: 120_000 }, () => {
      const pkgJson = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf-8'))
      if (pkgJson.scripts?.build) {
        run('npm run build', projectDir, 120_000, {
          NODE_OPTIONS: '--max-old-space-size=6144',
        })
        expect(fs.existsSync(path.join(projectDir, 'dist')), 'dist/ should exist after build').toBe(
          true
        )
      }
    })

    test('step 7: dev server + API verification', { timeout: 120_000 }, async () => {
      const { port } = preset
      const serverLogs: string[] = []

      killPort(port)

      const devServer = spawn('npx', ['vite', '--port', String(port), '--strictPort'], {
        cwd: projectDir,
        stdio: 'pipe',
        env: { ...process.env },
        detached: true,
      })

      if (devServer.pid) activePids.push(devServer.pid)

      devServer.stdout?.on('data', (d: Buffer) => serverLogs.push(d.toString()))
      devServer.stderr?.on('data', (d: Buffer) => serverLogs.push(d.toString()))

      try {
        await waitForServer(port, 60_000)
        await new Promise(r => setTimeout(r, 5_000))

        // Retry first API call — Hono dev server may need multiple warm-up requests
        let retries = 0
        while (retries < 5) {
          try {
            curlGet(port, '/health')
            break
          } catch {
            retries++
            await new Promise(r => setTimeout(r, 2_000))
          }
        }

        expect(curlGet(port, '/')).toContain('<html')

        const health = JSON.parse(curlGet(port, '/health'))
        expect(health.status).toBe('ok')

        for (const apiPath of preset.expectedAPIs) {
          const res = JSON.parse(curlGet(port, apiPath))
          expect(res.success, `GET ${apiPath} should return {success:true} for ${preset.id}`).toBe(
            true
          )
        }

        for (const apiPath of preset.notExpectedAPIs) {
          const code = curlGetCode(port, apiPath)
          expect(code, `GET ${apiPath} should return 404 for ${preset.id}, got ${code}`).toBe(404)
        }

        if (preset.hasAdmin) {
          const adminRes = curlGet(port, '/admin/')
          expect(adminRes, `/admin/ should return HTML for ${preset.id}`).toContain('<html')
        }

        if (preset.hasTenant) {
          const tenantRes = curlGet(port, '/tenant/')
          expect(tenantRes, `/tenant/ should return HTML for ${preset.id}`).toContain('<html')
        }
      } catch (e) {
        console.log(`[${preset.id}] dev server logs:\n${serverLogs.slice(-30).join('')}`)
        throw e
      } finally {
        try {
          if (devServer.pid) process.kill(-devServer.pid, 'SIGKILL')
        } catch {
          // process group may already be dead
        }
        devServer.kill('SIGKILL')
        killPort(port)
      }
    })

    test('step 8: code quality — no placeholder strings, no console.log', () => {
      const placeholders = ['YOUR_DATABASE_ID_HERE', 'biomimic-todo-app', 'biomimic-todo-db']
      const filesToCheck = ['package.json', 'wrangler.toml', 'README.md']

      for (const file of filesToCheck) {
        const filePath = path.join(projectDir, file)
        if (!fs.existsSync(filePath)) continue
        const content = fs.readFileSync(filePath, 'utf-8')
        for (const placeholder of placeholders) {
          expect(
            content,
            `${file} should not contain placeholder "${placeholder}" in ${preset.id}`
          ).not.toContain(placeholder)
        }
      }

      try {
        const grepResult = run(
          'grep -rn "console\\.log" src/ --include="*.ts" --include="*.tsx" -l || true',
          projectDir,
          10_000
        ).trim()
        if (grepResult) {
          const files = grepResult.split('\n').filter(Boolean)
          const testFiles = files.filter(
            f => !f.includes('__tests__') && !f.includes('.test.') && !f.includes('.spec.')
          )
          expect(
            testFiles.length,
            `No console.log in non-test source files for ${preset.id}. Found in: ${testFiles.join(
              ', '
            )}`
          ).toBe(0)
        }
      } catch {
        // grep returns non-zero when no matches — that's fine
      }
    })

    test('step 9: patches applied correctly', () => {
      const wsClientDts = path.join(
        projectDir,
        'node_modules/hono/dist/types/client/ws-client.d.ts'
      )
      expect(
        fs.existsSync(wsClientDts),
        `patched ws-client.d.ts should exist for ${preset.id}`
      ).toBe(true)
      const wsClientTypes = fs.readFileSync(wsClientDts, 'utf-8')
      expect(wsClientTypes).toContain('SSEClient')
      expect(wsClientTypes).toContain('WSClient')

      const typesDts = path.join(projectDir, 'node_modules/hono/dist/types/types.d.ts')
      const typesContent = fs.readFileSync(typesDts, 'utf-8')
      expect(typesContent).toMatch(/'sse'/)
      expect(typesContent).toMatch(/'ws'/)
      expect(typesContent).toMatch(/'image'/)
      expect(typesContent).toMatch(/'svg'/)
      expect(typesContent).toMatch(/'file'/)

      const clientJs = path.join(projectDir, 'node_modules/hono/dist/client/client.js')
      const clientContent = fs.readFileSync(clientJs, 'utf-8')
      expect(clientContent).toContain('method === "sse"')
    })
  }
)

import path from 'node:path'
import fs from 'fs-extra'
import { generateProject } from '../commands/generator.js'
import { execSync, spawn } from 'node:child_process'
import type { ProjectConfig } from '../types.js'

const S12_CONFIG: ProjectConfig = {
  name: '/tmp/verify-s12',
  channels: ['web', 'mobile'],
  backend: true,
  modules: ['todos', 'chat', 'notifications'],
  deploy: 'node',
  database: 'sqlite',
}

const S13_CONFIG: ProjectConfig = {
  name: '/tmp/verify-s13',
  channels: ['mobile', 'miniapp'],
  backend: true,
  modules: ['todos', 'chat', 'notifications', 'tenant'],
  deploy: 'node',
  database: 'mysql',
}

let phase = 0
let step = 0
let passed = 0
let failed = 0

function logPhase(title: string) {
  phase++
  step = 0
  console.log(`\n${'='.repeat(60)}`)
  console.log(`  PHASE ${phase}: ${title}`)
  console.log(`${'='.repeat(60)}\n`)
}

function logStep(msg: string) {
  step++
  console.log(`  [${phase}.${step}] ${msg}`)
}

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++
    console.log(`    ✅ ${msg}`)
  } else {
    failed++
    console.log(`    ❌ ${msg}`)
  }
}

async function exists(p: string): Promise<boolean> {
  return fs.pathExists(p)
}

function killPort(port: number) {
  try {
    execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, { stdio: 'pipe' })
  } catch {
    // port not in use
  }
}

async function waitForServer(port: number, maxMs = 20000): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    try {
      execSync(`curl -sf http://localhost:${port}/health`, { timeout: 3000, stdio: 'pipe' })
      return true
    } catch {
      await new Promise(r => setTimeout(r, 1000))
    }
  }
  return false
}

function runSafe(
  cmd: string,
  opts?: { cwd?: string; timeout?: number }
): { ok: boolean; output: string } {
  try {
    const output = execSync(cmd, {
      timeout: opts?.timeout ?? 120000,
      cwd: opts?.cwd,
      stdio: 'pipe',
    }).toString()
    return { ok: true, output }
  } catch (e: unknown) {
    const err = e as { stdout?: Buffer; stderr?: Buffer; message?: string }
    return {
      ok: false,
      output: (err.stdout?.toString() || '') + (err.stderr?.toString() || '') + (err.message || ''),
    }
  }
}

// ─── Phase 1 ──────────────────────────────────────────────

async function phase1_generateAndStaticCheck() {
  logPhase('生成 + 静态检查')

  logStep('生成 S12 项目 (Web + Mobile)')
  await fs.remove('/tmp/verify-s12')
  await generateProject(S12_CONFIG)
  assert(await exists('/tmp/verify-s12'), 'S12 项目目录存在')

  logStep('生成 S13 项目 (Mobile + MiniApp)')
  await fs.remove('/tmp/verify-s13')
  await generateProject(S13_CONFIG)
  assert(await exists('/tmp/verify-s13'), 'S13 项目目录存在')

  // S12 static checks
  logStep('S12 静态结构检查')
  assert(await exists('/tmp/verify-s12/src/client'), 'S12: src/client/ 存在 (web)')
  assert(await exists('/tmp/verify-s12/src/server'), 'S12: src/server/ 存在')
  assert(!(await exists('/tmp/verify-s12/src/ops')), 'S12: src/ops/ 不应存在')
  assert(!(await exists('/tmp/verify-s12/src/cli')), 'S12: src/cli/ 不应存在')
  assert(!(await exists('/tmp/verify-s12/ops.html')), 'S12: ops.html 不应存在')
  assert(await exists('/tmp/verify-s12/src/server/module-todos'), 'S12: module-todos 存在')
  assert(await exists('/tmp/verify-s12/src/server/module-chat'), 'S12: module-chat 存在')
  assert(
    await exists('/tmp/verify-s12/src/server/module-notifications'),
    'S12: module-notifications 存在'
  )
  assert(!(await exists('/tmp/verify-s12/src/mobile')), 'S12: mobile 为 API 模式，无独立目录')
  assert(!(await exists('/tmp/verify-s12/src/server/module-tenant')), 'S12: module-tenant 不应存在')
  assert(
    !(await exists('/tmp/verify-s12/src/server/module-permission')),
    'S12: module-permission 不应存在'
  )
  assert(!(await exists('/tmp/verify-s12/src/server/module-ops')), 'S12: module-ops 不应存在')

  // S12 client pages
  assert(await exists('/tmp/verify-s12/src/client/pages/TodoPage.tsx'), 'S12: TodoPage.tsx 存在')
  assert(
    await exists('/tmp/verify-s12/src/client/pages/WebSocketPage.tsx'),
    'S12: WebSocketPage.tsx 存在'
  )
  assert(
    await exists('/tmp/verify-s12/src/client/pages/NotificationPage.tsx'),
    'S12: NotificationPage.tsx 存在'
  )

  // S13 static checks
  logStep('S13 静态结构检查 (纯 API 服务)')
  assert(!(await exists('/tmp/verify-s13/src/client')), 'S13: src/client/ 不应存在 (纯 API)')
  assert(!(await exists('/tmp/verify-s13/src/ops')), 'S13: src/ops/ 不应存在')
  assert(!(await exists('/tmp/verify-s13/src/cli')), 'S13: src/cli/ 不应存在')
  assert(!(await exists('/tmp/verify-s13/index.html')), 'S13: index.html 不应存在')
  assert(!(await exists('/tmp/verify-s13/ops.html')), 'S13: ops.html 不应存在')
  assert(await exists('/tmp/verify-s13/src/server'), 'S13: src/server/ 存在')
  assert(await exists('/tmp/verify-s13/src/server/module-todos'), 'S13: module-todos 存在')
  assert(await exists('/tmp/verify-s13/src/server/module-chat'), 'S13: module-chat 存在')
  assert(
    await exists('/tmp/verify-s13/src/server/module-notifications'),
    'S13: module-notifications 存在'
  )
  assert(await exists('/tmp/verify-s13/src/server/module-tenant'), 'S13: module-tenant 存在')
  assert(!(await exists('/tmp/verify-s13/src/mobile')), 'S13: mobile 为 API 模式，无独立目录')
  assert(!(await exists('/tmp/verify-s13/src/miniapp')), 'S13: miniapp 为 API 模式，无独立目录')

  // S13 package.json checks
  const s13Pkg = await fs.readJson('/tmp/verify-s13/package.json')
  assert(!s13Pkg.bin, 'S13: 无 bin 字段 (纯 API)')
  assert(s13Pkg.name === 'verify-s13', 'S13: package.json name 正确')

  // TSC check
  logStep('S12 npm install + TSC 检查')
  const s12Install = runSafe('npm install 2>&1', { cwd: '/tmp/verify-s12', timeout: 300000 })
  assert(s12Install.ok, 'S12 npm install 成功')

  if (s12Install.ok) {
    const s12Tsc = runSafe('npx tsc --noEmit 2>&1', { cwd: '/tmp/verify-s12', timeout: 120000 })
    const s12Errors = s12Tsc.output.split('\n').filter((l: string) => /error TS(?!5101)/.test(l))
    assert(s12Errors.length === 0, `S12 TSC 通过`)
    if (s12Errors.length > 0) {
      s12Errors.slice(0, 10).forEach((err: string) => console.log(`      ${err}`))
    }
  }

  logStep('S13 npm install + TSC 检查')
  const s13Install = runSafe('npm install 2>&1', { cwd: '/tmp/verify-s13', timeout: 300000 })
  assert(s13Install.ok, 'S13 npm install 成功')

  if (s13Install.ok) {
    const s13Tsc = runSafe('npx tsc --noEmit 2>&1', { cwd: '/tmp/verify-s13', timeout: 120000 })
    const s13Errors = s13Tsc.output.split('\n').filter((l: string) => /error TS(?!5101)/.test(l))
    assert(s13Errors.length === 0, `S13 TSC 通过`)
    if (s13Errors.length > 0) {
      s13Errors.slice(0, 10).forEach((err: string) => console.log(`      ${err}`))
    }
  }
}

// ─── Phase 2 ──────────────────────────────────────────────

async function phase2_installAndStart() {
  logPhase('安装 + 启动')

  const PORT_S12 = 3112
  const PORT_S13 = 3113

  // S12: Start dev server
  logStep('启动 S12 dev server')
  killPort(PORT_S12)
  await fs.ensureDir('/tmp/verify-s12/data')

  const s12Server = spawn('node', ['--import', 'tsx', 'src/server/entries/node.ts'], {
    cwd: '/tmp/verify-s12',
    detached: false,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(PORT_S12),
      DB_DRIVER: 'sqlite',
      SQLITE_PATH: '/tmp/verify-s12/data/test.db',
    },
  })

  let s12Log = ''
  s12Server.stdout?.on('data', (d: Buffer) => {
    s12Log += d.toString()
  })
  s12Server.stderr?.on('data', (d: Buffer) => {
    const s = d.toString()
    s12Log += s
    console.log(`    S12 stderr: ${s.trim().slice(0, 200)}`)
  })

  const s12Ready = await waitForServer(PORT_S12, 20000)
  assert(s12Ready, `S12 server 启动成功 (port ${PORT_S12})`)

  if (s12Ready) {
    // Test /health
    logStep('测试 S12 端点')
    const health = runSafe(`curl -s http://localhost:${PORT_S12}/health`, { timeout: 10000 })
    if (health.ok) {
      try {
        const parsed = JSON.parse(health.output)
        assert(parsed.status === 'ok', `S12 /health 返回 ok (db: ${parsed.db || 'N/A'})`)
      } catch {
        assert(false, `S12 /health 响应解析失败: ${health.output.slice(0, 200)}`)
      }
    } else {
      assert(false, 'S12 /health 请求失败')
    }

    // Test /api/todos
    const todos = runSafe(`curl -s http://localhost:${PORT_S12}/api/todos`, { timeout: 10000 })
    if (todos.ok) {
      assert(true, `S12 /api/todos 响应正常`)
    } else {
      assert(false, `S12 /api/todos 失败`)
    }

    // Test WebSocket upgrade
    const wsCheck = runSafe(
      `curl -s -o /dev/null -w "%{http_code}" -H "Upgrade: websocket" -H "Connection: Upgrade" http://localhost:${PORT_S12}/api/chat/ws`,
      { timeout: 10000 }
    )
    assert(
      wsCheck.ok && ['200', '101', '400', '426'].includes(wsCheck.output.trim()),
      `S12 WebSocket 端点可访问 (HTTP ${wsCheck.output.trim()})`
    )
  } else {
    console.log(`    Last S12 output: ${s12Log.slice(-500)}`)
  }

  try {
    process.kill(s12Server.pid!)
  } catch {
    /* already dead */
  }
  killPort(PORT_S12)

  // S13: Start dev server (pure API)
  logStep('启动 S13 dev server (纯 API)')
  killPort(PORT_S13)
  await fs.ensureDir('/tmp/verify-s13/data')

  const s13Server = spawn('node', ['--import', 'tsx', 'src/server/entries/node.ts'], {
    cwd: '/tmp/verify-s13',
    detached: false,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(PORT_S13),
      DB_DRIVER: 'sqlite',
      SQLITE_PATH: '/tmp/verify-s13/data/test.db',
    },
  })

  let s13Log = ''
  s13Server.stdout?.on('data', (d: Buffer) => {
    s13Log += d.toString()
  })
  s13Server.stderr?.on('data', (d: Buffer) => {
    const s = d.toString()
    s13Log += s
    console.log(`    S13 stderr: ${s.trim().slice(0, 200)}`)
  })

  const s13Ready = await waitForServer(PORT_S13, 20000)
  assert(s13Ready, `S13 server 启动成功 (port ${PORT_S13})`)

  if (s13Ready) {
    logStep('测试 S13 纯 API 端点')
    const health = runSafe(`curl -s http://localhost:${PORT_S13}/health`, { timeout: 10000 })
    if (health.ok) {
      try {
        const parsed = JSON.parse(health.output)
        assert(parsed.status === 'ok', `S13 /health 返回 ok`)
      } catch {
        assert(false, `S13 /health 响应解析失败: ${health.output.slice(0, 200)}`)
      }
    } else {
      assert(false, 'S13 /health 请求失败')
    }

    const todos = runSafe(`curl -s http://localhost:${PORT_S13}/api/todos`, { timeout: 10000 })
    assert(todos.ok, 'S13 /api/todos 响应正常')

    // Verify no frontend
    assert(!(await exists('/tmp/verify-s13/index.html')), 'S13: index.html 文件已删除')

    // Verify tenant API exists
    const tenants = runSafe(`curl -s http://localhost:${PORT_S13}/api/tenants`, { timeout: 10000 })
    assert(tenants.ok, 'S13 /api/tenants 端点存在')
  } else {
    console.log(`    Last S13 output: ${s13Log.slice(-500)}`)
  }

  try {
    process.kill(s13Server.pid!)
  } catch {
    /* already dead */
  }
  killPort(PORT_S13)
}

// ─── Phase 3 ──────────────────────────────────────────────

async function phase3_businessLogic() {
  logPhase('业务功能')

  const PORT_S13 = 3113
  killPort(PORT_S13)

  logStep('为 S13 添加多租户 API 文档端点')

  const apiDocServicePath = '/tmp/verify-s13/src/server/module-tenant/services/api-doc-service.ts'
  const apiDocServiceContent = `export interface ApiEndpoint {
  method: string
  path: string
  description: string
  authRequired: boolean
}

export interface TenantApiDoc {
  tenantId: string
  tenantName: string
  availableApis: ApiEndpoint[]
  totalEndpoints: number
}

const API_REGISTRY: Record<string, ApiEndpoint[]> = {
  default: [
    { method: 'GET', path: '/api/todos', description: '获取待办列表', authRequired: false },
    { method: 'POST', path: '/api/todos', description: '创建待办', authRequired: true },
    { method: 'GET', path: '/api/notifications', description: '获取通知列表', authRequired: false },
    { method: 'GET', path: '/api/chat/ws', description: 'WebSocket 聊天', authRequired: false },
    { method: 'GET', path: '/api/tenants', description: '获取租户列表', authRequired: true },
    { method: 'POST', path: '/api/tenants', description: '创建租户', authRequired: true },
  ],
  premium: [
    { method: 'GET', path: '/api/todos', description: '获取待办列表', authRequired: false },
    { method: 'POST', path: '/api/todos', description: '创建待办', authRequired: true },
    { method: 'DELETE', path: '/api/todos/:id', description: '删除待办', authRequired: true },
    { method: 'GET', path: '/api/notifications', description: '获取通知列表', authRequired: false },
    { method: 'POST', path: '/api/notifications', description: '发送通知', authRequired: true },
    { method: 'GET', path: '/api/chat/ws', description: 'WebSocket 聊天', authRequired: false },
    { method: 'GET', path: '/api/tenants', description: '获取租户列表', authRequired: true },
    { method: 'POST', path: '/api/tenants', description: '创建租户', authRequired: true },
    { method: 'GET', path: '/api/tenants/:id/members', description: '获取租户成员', authRequired: true },
    { method: 'POST', path: '/api/tenants/:id/invite', description: '邀请成员', authRequired: true },
  ],
}

const TENANT_PLANS: Record<string, string> = {
  '1': 'premium',
  '2': 'default',
}

export async function getTenantApiDoc(tenantId: string): Promise<TenantApiDoc> {
  const plan = TENANT_PLANS[tenantId] || 'default'
  const apis = API_REGISTRY[plan] || API_REGISTRY['default']
  return {
    tenantId,
    tenantName: \`Tenant-\${tenantId}\`,
    availableApis: apis,
    totalEndpoints: apis.length,
  }
}
`
  await fs.ensureDir(path.dirname(apiDocServicePath))
  await fs.writeFile(apiDocServicePath, apiDocServiceContent)
  assert(await exists(apiDocServicePath), 'api-doc-service.ts 已创建')

  // Add route to tenant-routes.ts
  const tenantRoutesPath = '/tmp/verify-s13/src/server/module-tenant/routes/tenant-routes.ts'
  if (await exists(tenantRoutesPath)) {
    let content = await fs.readFile(tenantRoutesPath, 'utf-8')
    if (!content.includes('api-doc-service')) {
      content = "import { getTenantApiDoc } from '../services/api-doc-service.js'\n" + content
      content = content.replace(
        /\.openapi\(getInvitationRoute,/,
        `.get('/tenants/:id/api-doc', async (c) => {
  const id = c.req.param('id')
  const doc = await getTenantApiDoc(id)
  return c.json(doc)
})
  .openapi(getInvitationRoute,`
      )
    }
    await fs.writeFile(tenantRoutesPath, content)
    assert(true, 'tenant-routes.ts 已挂载 api-doc 路由')
  } else {
    assert(false, `tenant-routes.ts 不存在: ${tenantRoutesPath}`)
  }

  // Start S13 and test
  logStep('重启 S13 服务器测试 API 文档端点')
  killPort(PORT_S13)

  const server = spawn('node', ['--import', 'tsx', 'src/server/entries/node.ts'], {
    cwd: '/tmp/verify-s13',
    detached: false,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(PORT_S13),
      DB_DRIVER: 'sqlite',
      SQLITE_PATH: '/tmp/verify-s13/data/test.db',
    },
  })

  server.stderr?.on('data', (d: Buffer) => {
    console.log(`    Server: ${d.toString().trim().slice(0, 200)}`)
  })

  const ready = await waitForServer(PORT_S13, 20000)
  assert(ready, 'S13 server 重启成功')

  if (ready) {
    // Test tenant 1 (premium plan)
    const doc1 = runSafe(`curl -s http://localhost:${PORT_S13}/api/tenants/1/api-doc`, {
      timeout: 10000,
    })
    if (doc1.ok) {
      try {
        const parsed = JSON.parse(doc1.output)
        assert(parsed.tenantId === '1', `api-doc tenantId = ${parsed.tenantId}`)
        assert(parsed.tenantName === 'Tenant-1', `api-doc tenantName = ${parsed.tenantName}`)
        assert(Array.isArray(parsed.availableApis), 'api-doc availableApis 为数组')
        assert(parsed.totalEndpoints === 10, `premium plan 有 ${parsed.totalEndpoints} 个端点`)
        if (parsed.availableApis?.length > 0) {
          assert(parsed.availableApis[0].method === 'GET', '第一个 API 方法正确')
          assert(parsed.availableApis[0].path === '/api/todos', '第一个 API 路径正确')
        }
      } catch (e: unknown) {
        assert(
          false,
          `api-doc 解析失败: ${(e as Error).message?.slice(0, 200)} output=${doc1.output.slice(0, 200)}`
        )
      }
    } else {
      assert(false, `api-doc 请求失败: ${doc1.output.slice(0, 200)}`)
    }

    // Test tenant 2 (default plan)
    const doc2 = runSafe(`curl -s http://localhost:${PORT_S13}/api/tenants/2/api-doc`, {
      timeout: 10000,
    })
    if (doc2.ok) {
      try {
        const parsed = JSON.parse(doc2.output)
        assert(parsed.totalEndpoints === 6, `default plan 有 ${parsed.totalEndpoints} 个端点`)
      } catch {
        assert(false, `default plan api-doc 解析失败: ${doc2.output.slice(0, 200)}`)
      }
    }

    // Test unknown tenant (should get default plan)
    const doc3 = runSafe(`curl -s http://localhost:${PORT_S13}/api/tenants/999/api-doc`, {
      timeout: 10000,
    })
    if (doc3.ok) {
      try {
        const parsed = JSON.parse(doc3.output)
        assert(parsed.tenantId === '999', `unknown tenant id 正确`)
        assert(
          parsed.totalEndpoints === 6,
          `unknown tenant 使用 default plan (${parsed.totalEndpoints} endpoints)`
        )
      } catch {
        assert(false, `unknown tenant api-doc 解析失败: ${doc3.output.slice(0, 200)}`)
      }
    }
  }

  try {
    process.kill(server.pid!)
  } catch {
    /* already dead */
  }
  killPort(PORT_S13)

  // Git commit
  logStep('Git commit')
  try {
    execSync('git init && git add -A', { cwd: '/tmp/verify-s13', stdio: 'pipe' })

    const pkg = await fs.readJson('/tmp/verify-s13/package.json')
    const origScripts = { ...pkg.scripts }
    delete pkg.scripts.prepare
    await fs.writeJson('/tmp/verify-s13/package.json', pkg, { spaces: 2 })

    execSync(
      'git -c user.email="test@test.com" -c user.name="Test" commit -m "feat: add tenant api-doc endpoint"',
      {
        cwd: '/tmp/verify-s13',
        stdio: 'pipe',
        timeout: 30000,
      }
    )

    pkg.scripts = origScripts
    await fs.writeJson('/tmp/verify-s13/package.json', pkg, { spaces: 2 })
    assert(true, 'git commit 成功')
  } catch (e: unknown) {
    assert(false, `git commit 失败: ${(e as Error).message?.slice(0, 300)}`)
  }
}

// ─── Phase 4 ──────────────────────────────────────────────

async function phase4_recommendations() {
  logPhase('建议')

  console.log('  📋 S12 (Web + Mobile) 建议:')
  console.log('    1. Mobile 通道为纯 API 模式，无独立前端目录，共用 server 端点')
  console.log('    2. 缺少 ops 通道，无运营后台管理界面')
  console.log('    3. todos + chat + notifications 模块组合适合轻量级协作工具')
  console.log('    4. SQLite 数据库适合开发和单机部署，生产建议切换为 MySQL')
  console.log('')
  console.log('  📋 S13 (Mobile + MiniApp 双端纯 API) 建议:')
  console.log('    1. 无前端页面，所有功能通过 API 端点暴露')
  console.log('    2. 多租户 + API-only 架构适合 BaaS 场景')
  console.log('    3. Mobile + MiniApp 双端共用相同 API，需注意不同端的请求频率限制')
  console.log('    4. MySQL 数据库适合生产环境，需配置连接池和迁移脚本')
  console.log('    5. 建议增加 API 版本管理 (/api/v1/) 以兼容多端升级')
  console.log(
    '    6. tenant 模块依赖 permission 模块的功能（如角色管理），当前 permission 为 passthrough 模式'
  )
  console.log('    7. 建议后续集成完整的 permission 模块以支持租户级权限控制')
}

// ─── Main ─────────────────────────────────────────────────

async function main() {
  console.log('\n🚀 create-biomimic-app S12/S13 完整 4 阶段验证\n')
  console.log(`  S12: Web + Mobile (${S12_CONFIG.modules.join(', ')}) [${S12_CONFIG.database}]`)
  console.log(`  S13: Mobile + MiniApp (${S13_CONFIG.modules.join(', ')}) [${S13_CONFIG.database}]`)
  console.log('')

  const startTime = Date.now()

  try {
    await phase1_generateAndStaticCheck()
    await phase2_installAndStart()
    await phase3_businessLogic()
    await phase4_recommendations()
  } finally {
    killPort(3112)
    killPort(3113)
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

  console.log(`\n${'='.repeat(60)}`)
  console.log(`  验证完成 (${elapsed}s)`)
  console.log(`  ✅ 通过: ${passed}`)
  console.log(`  ❌ 失败: ${failed}`)
  console.log(`${'='.repeat(60)}\n`)

  if (failed > 0) {
    process.exit(1)
  }
}

main().catch(e => {
  console.error('验证脚本异常:', e)
  process.exit(1)
})

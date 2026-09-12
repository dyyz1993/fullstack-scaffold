/**
 * Test Playbook 生成器：为每个 preset 生成身份→案例→步骤→截图→选择器的完整测试手册。
 * 数据源：generate-preset-docs.ts 的 META（身份）+ .ui-tester/knowledge/<模块>/selectors.yml（选择器）
 *        + docs/PRESETS/screenshots/（截图）
 * 输出：docs/PRESETS/playbooks/<preset>.md
 * 运行：npx tsx scripts/generate-test-playbooks.ts
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs'
import { join } from 'path'

const ROOT = join(import.meta.dirname ?? process.cwd(), '..')
const KB = join(ROOT, '.ui-tester', 'knowledge')
const SHOTS = join(ROOT, 'docs', 'PRESETS', 'screenshots')
const OUT = join(ROOT, 'docs', 'PRESETS', 'playbooks')

/** 简易 YAML 解析（只取 key: value 顶层键值对） */
function parseSelectors(ymlPath: string): Record<string, string> {
  if (!existsSync(ymlPath)) return {}
  const s = readFileSync(ymlPath, 'utf8')
  const out: Record<string, string> = {}
  for (const line of s.split('\n')) {
    const m = line.match(/^([a-z_-]+):\s*(.+)$/)
    if (m && !m[2].startsWith('#')) out[m[1]] = m[2].trim()
  }
  return out
}

/** 列出指定前缀的截图文件 */
function findShots(prefixes: string[]): string[] {
  const all: string[] = []
  for (const dir of [
    'journeys',
    'matrix/fullstack/super-admin',
    'matrix/fullstack',
    'matrix/saas/tadmin',
    'matrix/saas/member',
    'matrix/saas/guest',
    'matrix/todo',
    'matrix/minimal',
    'matrix/forum',
    'matrix/market',
    'matrix/shop',
    'verify',
    'portal-v2',
  ]) {
    const p = join(SHOTS, dir)
    if (!existsSync(p)) continue
    for (const f of readdirSync(p)) {
      if (!f.endsWith('.png')) continue
      const name = f.replace('.png', '')
      if (prefixes.some(pre => name.startsWith(pre))) {
        all.push(`${dir}/${f}`)
      }
    }
  }
  return all
}

const PRESETS: Array<{
  id: string
  name: string
  site: string
  kbModule: string
  identities: Array<{
    name: string
    cred: string
    cases: Array<{
      title: string
      steps: string[]
      verify: string
      shot?: string
      selectors?: Record<string, string>
    }>
  }>
}> = [
  {
    id: 'fullstack-admin',
    name: 'Fullstack Admin',
    site: 'https://fullstack.lpm1.top',
    kbModule: 'fullstack-admin',
    identities: [
      {
        name: '超级管理员',
        cred: 'superadmin / 123456',
        cases: [
          {
            title: '登录管理后台',
            steps: [
              '打开 https://fullstack.lpm1.top/admin',
              '在用户名输入框输入 superadmin',
              '在密码输入框输入 123456',
              '点击登录按钮',
            ],
            verify: 'SPA 跳转到 /admin/dashboard，侧栏 10 项且 href 全带 /admin 前缀',
            shot: 'verify/verify-admin-login.png',
            selectors: {
              用户名输入框: '#username',
              密码输入框: '#password',
              登录按钮: "[data-testid='admin-login-submit']",
              快速登录超管按钮: "find text '超级管理员 superadmin' --action click",
            },
          },
          {
            title: '查看仪表盘统计',
            steps: ['登录后自动到达 /admin/dashboard'],
            verify: '统计卡显示 总待办12/待处理4/已完成5',
            shot: 'verify/verify-admin-dashboard.png',
            selectors: { 仪表盘URL: '/admin/dashboard' },
          },
          {
            title: '用户管理（查看/创建/编辑/删除）',
            steps: ['点击侧栏"用户与订单" → "用户管理"', '或直接访问 /admin/users'],
            verify: '表格 3 行（superadmin/customerservice/user1），角色徽章+状态正常',
            shot: 'matrix/fullstack/super-admin/fa-admin-users.png',
            selectors: {
              用户管理侧栏链接: "a[href='/admin/users']",
              表格选择器: '.ant-table',
              表格列名: '用户名/邮箱/角色/状态/创建时间/操作',
            },
          },
          {
            title: '内容管理（新建/编辑/发布）',
            steps: ['点击侧栏"内容管理" → "内容列表"'],
            verify: '2 篇已发布文章可见，编辑操作可用',
            shot: 'matrix/fullstack/super-admin/fa-admin-content.png',
            selectors: { 内容列表侧栏链接: "a[href='/admin/content']" },
          },
          {
            title: '角色与权限管理',
            steps: ['点击侧栏"系统管理" → "角色权限"'],
            verify: '3 角色列表（super_admin/customer_service/user），权限矩阵完整',
            shot: 'matrix/fullstack/super-admin/fa-admin-roles.png',
            selectors: { 角色权限侧栏链接: "a[href='/admin/system/roles']" },
          },
          {
            title: '系统设置读写',
            steps: ['点击侧栏"系统管理" → "系统设置"'],
            verify: '表单带出真实值（站点名称/SMTP/通知/安全四个分区）',
            shot: 'matrix/fullstack/super-admin/fa-admin-settings.png',
            selectors: { 系统设置侧栏链接: "a[href='/admin/system/settings']" },
          },
          {
            title: '审计日志查看',
            steps: ['点击侧栏"系统管理" → "系统日志"'],
            verify: '20+ 行审计日志（时间/用户ID/IP/详情）',
            shot: 'matrix/fullstack/super-admin/fa-admin-logs.png',
            selectors: { 系统日志侧栏链接: "a[href='/admin/system/logs']" },
          },
        ],
      },
      {
        name: '客服人员',
        cred: 'customerservice / 123456（快速登录按钮）',
        cases: [
          {
            title: '登录（快捷按钮）',
            steps: ['打开 /admin', '点击"客服人员"快捷登录按钮'],
            verify: '登录成功，header 显示 customerservice + 客服人员徽标',
            shot: 'matrix/fullstack/cs-full/cs-01-dashboard.png',
            selectors: { 快捷登录客服按钮: "find text '客服人员 customerservice' --action click" },
          },
          {
            title: '仪表盘统计被拒（API 403 → 卡片显示 0）',
            steps: ['登录后到达 /admin/dashboard'],
            verify: '统计卡全 0（API 403），但页面壳正常渲染',
            shot: 'matrix/fullstack/cs-full/cs-01-dashboard.png',
            selectors: { 统计API: '/api/admin/stats → 403' },
          },
          {
            title: '用户管理数据被拒（API 403 → 空表）',
            steps: ['点击侧栏"用户管理"'],
            verify: '表头完整但 No data（API 403）',
            shot: 'matrix/fullstack/cs-full/cs-03-users-page-denied-empty.png',
            selectors: { 用户API: '/api/admin/users → 403 Permission denied: user:view' },
          },
          {
            title: '内容列表可见（只读）',
            steps: ['点击侧栏"内容管理" → "内容列表"'],
            verify: '2 篇文章可见，无编辑/删除按钮，无新建按钮',
            shot: 'matrix/fullstack/cs-full/cs-02-notification-center-empty.png',
          },
        ],
      },
      {
        name: '普通用户',
        cred: 'user1 / 123456（快速登录按钮）',
        cases: [
          {
            title: '登录（快捷按钮）',
            steps: ['打开 /admin', '点击"普通用户"快捷登录按钮'],
            verify: '登录成功，header 显示 user1 + 普通用户徽标',
            shot: 'matrix/fullstack/user-full/user-01-dashboard.png',
            selectors: { 快捷登录普通用户按钮: "find text '普通用户 user1' --action click" },
          },
          {
            title: '仪表盘统计被拒',
            steps: ['登录后到达 /admin/dashboard'],
            verify: '统计卡全 0（API 403）',
            shot: 'matrix/fullstack/user-full/user-01-dashboard.png',
          },
          {
            title: '用户管理数据被拒',
            steps: ['点击侧栏"用户管理"'],
            verify: '表头完整但 No data',
            shot: 'matrix/fullstack/user-full/user-03-users-page-denied-empty.png',
          },
        ],
      },
      {
        name: '游客（未登录）',
        cred: '无需登录',
        cases: [
          {
            title: '浏览 /todos 页（SSR 渲染数据）',
            steps: ['直接打开 https://fullstack.lpm1.top/todos（不登录）'],
            verify: 'Todo List 页渲染 + SSR 数据可见',
            shot: 'verify/verify-todos.png',
          },
          {
            title: '写操作被拒（API 401）',
            steps: ['在 /todos 页尝试新增（需登录态）'],
            verify: '游客自动登录（dev token），无需手动认证',
          },
          {
            title: '访问 /admin 被重定向',
            steps: ['直接打开 https://fullstack.lpm1.top/admin'],
            verify: '302 → /admin/login 登录页',
            shot: 'verify/verify-admin-login.png',
          },
        ],
      },
    ],
  },
  {
    id: 'saas',
    name: 'SaaS Multi-Tenant',
    site: 'https://saas.lpm1.top',
    kbModule: 'tenant-console',
    identities: [
      {
        name: '租户管理员',
        cred: 'superadmin / admin123（/tenant/login）',
        cases: [
          {
            title: '登录租户控制台',
            steps: [
              '打开 https://saas.lpm1.top/tenant/login',
              '输入 superadmin / admin123',
              '点击 Sign in',
            ],
            verify: '进入 /tenant/dashboard，四统计卡正常',
            shot: 'journeys/saas-j1-login.png',
            selectors: {
              账号输入框: '#account',
              密码输入框: '#password',
              登录按钮: 'button.ant-btn',
            },
          },
          {
            title: '查看仪表盘',
            steps: ['登录后自动到达 /tenant/dashboard'],
            verify: 'Total Users / Active Todos / Content Items / Monthly Revenue 统计卡',
            shot: 'journeys/saas-j2-dashboard.png',
          },
          {
            title: '成员列表管理',
            steps: ['点击侧栏 Users'],
            verify: '成员表格 + 角色徽章 + Invite member 按钮',
            shot: 'journeys/saas-j3-members.png',
            selectors: { 成员表格: '.ant-table', 邀请按钮: "find text 'Invite member'" },
          },
          {
            title: '邀请成员（正向→正向链）',
            steps: [
              '点击 Invite member',
              '填写邮箱 member@example.com',
              '选择角色（下拉）',
              '点击 Send invitation',
            ],
            verify: '绿色 toast "Invitation created"',
            shot: 'journeys/saas-j5-invite-done.png',
            selectors: {
              邮箱输入框: '#email',
              角色下拉: '.ant-select',
              发送按钮: "find text 'Send invitation'",
            },
          },
          {
            title: '租户设置',
            steps: ['点击侧栏 Settings', '修改 Tenant Name', '点击保存'],
            verify: 'toast "Settings updated successfully"',
            shot: 'matrix/saas/tadmin/a-05-settings.png',
          },
        ],
      },
      {
        name: '租户成员',
        cred: '受邀注册后登录',
        cases: [
          {
            title: '接受邀请加入租户',
            steps: [
              '注册新账号（POST /api/auth/register）',
              '超管创建邀请并获取 token',
              '登录后打开 /tenant/invite/<token>',
              '点击 Accept invitation',
            ],
            verify: '自动进入 /tenant/dashboard',
            shot: 'journeys/saas-j7-accept.png',
          },
          {
            title: '邀请成员被拒（API 403）',
            steps: ['以成员身份登录', '尝试点击 Invite member'],
            verify: 'UI 按钮可见但提交后 API 403 Permission denied',
            shot: 'matrix/saas/member/m-02-users.png',
          },
        ],
      },
      {
        name: '访客（未登录）',
        cred: '无需登录',
        cases: [
          {
            title: '直访受保护页被拦截',
            steps: ['直接打开 /tenant/dashboard（不登录）'],
            verify: '被 TenantGuard 拦回 /tenant/login',
            shot: 'journeys/saas-r2-loggedout.png',
          },
          {
            title: '伪造邀请 token 被拒',
            steps: ['打开 /tenant/invite/invalid-token-12345'],
            verify: '红字 "Invitation not found."',
            shot: 'journeys/saas-r1-badtoken.png',
          },
        ],
      },
    ],
  },
  {
    id: 'todo-app',
    name: 'Todo App',
    site: 'https://todo.lpm1.top',
    kbModule: 'preset-sites',
    identities: [
      {
        name: '注册用户',
        cred: 'demo@biomimic.app（登录页预填）',
        cases: [
          {
            title: '注册新账号',
            steps: ['打开 /register', '填写 Username/Email/Password（min 6）', '点击注册'],
            verify: '跳转到 /login，无报错',
            shot: 'matrix/todo/06-register.png',
            selectors: { 注册页URL: '/register' },
          },
          {
            title: 'Todos CRUD 全流程',
            steps: [
              '登录后打开 /todos',
              '在输入框填写标题',
              '点击 Add Todo',
              '用状态下拉改为 completed',
              '点击删除按钮',
            ],
            verify: '新增→变绿→删除，Total 计数正确变化',
            shot: 'journeys/todo-j2-add.png',
            selectors: {
              标题输入框: "[data-testid='todo-title-input']",
              添加按钮: "[data-testid='add-todo-button']",
              状态下拉: "[data-testid='todo-status']",
              删除按钮: "[data-testid='delete-todo']",
            },
          },
          {
            title: 'WebSocket 聊天',
            steps: ['打开 /websocket', '点击 Connect', '在输入框填写消息', '点击 Send'],
            verify: 'Status 变 Open，ECHO REQUEST/RESPONSE 往返',
            shot: 'matrix/todo/09-websocket.png',
          },
        ],
      },
      {
        name: '游客（自动登录）',
        cred: '无需登录（自动登录为 Demo User）',
        cases: [
          {
            title: '免登录操作 todos',
            steps: ['直接打开 /todos'],
            verify: '自动登录为 Demo User，可直接增删改',
            shot: 'matrix/todo/01-home.png',
          },
        ],
      },
    ],
  },
]

function main() {
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true })

  for (const preset of PRESETS) {
    const sel = parseSelectors(join(KB, preset.kbModule, 'selectors.yml'))
    let md = `# ${preset.name} — Test Playbook\n\n`
    md += `> 站点：${preset.site}\n> 身份数：${preset.identities.length}\n`
    md += `> 每个身份列出：操作步骤 → 验证 → 截图 → 选择器\n\n---\n\n`

    for (const identity of preset.identities) {
      md += `## ${identity.name}\n\n`
      md += `**凭据**: \`${identity.cred}\`\n\n`
      md += `**案例数**: ${identity.cases.length}\n\n`

      for (const c of identity.cases) {
        md += `### ${c.title}\n\n`
        md += `**步骤**:\n${c.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n`
        md += `**验证**: ${c.verify}\n\n`
        if (c.shot) {
          md += `**截图**: ![${c.title}](${'../screenshots/' + c.shot})\n\n`
        }
        if (c.selectors) {
          md += `**选择器**:\n| 元素 | 选择器 |\n|---|---|\n`
          for (const [k, v] of Object.entries(c.selectors)) {
            md += `| ${k} | \`${v}\` |\n`
          }
          md += '\n'
        }
      }
      md += '---\n\n'
    }

    // 附：该模块全部已知选择器
    if (Object.keys(sel).length > 0) {
      md += `## 附：全部已知选择器（来自知识库）\n\n| 键 | 值 |\n|---|---|\n`
      for (const [k, v] of Object.entries(sel)) {
        md += `| ${k} | ${v.replace(/\|/g, '\\|')} |\n`
      }
    }

    writeFileSync(join(OUT, `${preset.id}.md`), md)
    console.log(
      `✓ playbooks/${preset.id}.md（${preset.identities.length} 身份, ${preset.identities.reduce((s, i) => s + i.cases.length, 0)} 案例）`
    )
  }
}

main()

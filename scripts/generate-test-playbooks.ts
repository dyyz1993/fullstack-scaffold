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
            shot: 'matrix/fullstack/cs-01-dashboard.png',
            selectors: { 快捷登录客服按钮: "find text '客服人员 customerservice' --action click" },
          },
          {
            title: '仪表盘统计被拒（API 403 → 卡片显示 0）',
            steps: ['登录后到达 /admin/dashboard'],
            verify: '统计卡全 0（API 403），但页面壳正常渲染',
            shot: 'matrix/fullstack/cs-01-dashboard.png',
            selectors: { 统计API: '/api/admin/stats → 403' },
          },
          {
            title: '用户管理数据被拒（API 403 → 空表）',
            steps: ['点击侧栏"用户管理"'],
            verify: '表头完整但 No data（API 403）',
            shot: 'matrix/fullstack/cs-03-users-page-denied-empty.png',
            selectors: { 用户API: '/api/admin/users → 403 Permission denied: user:view' },
          },
          {
            title: '内容列表可见（只读）',
            steps: ['点击侧栏"内容管理" → "内容列表"'],
            verify: '2 篇文章可见，无编辑/删除按钮，无新建按钮',
            shot: 'matrix/fullstack/cs-02-notification-center-empty.png',
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
            shot: 'matrix/fullstack/user-01-dashboard.png',
            selectors: { 快捷登录普通用户按钮: "find text '普通用户 user1' --action click" },
          },
          {
            title: '仪表盘统计被拒',
            steps: ['登录后到达 /admin/dashboard'],
            verify: '统计卡全 0（API 403）',
            shot: 'matrix/fullstack/user-01-dashboard.png',
          },
          {
            title: '用户管理数据被拒',
            steps: ['点击侧栏"用户管理"'],
            verify: '表头完整但 No data',
            shot: 'matrix/fullstack/user-03-users-page-denied-empty.png',
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
            shot: 'matrix/todo/todo-09-register.png',
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
  {
    id: 'xbrowser-marketplace',
    name: 'XBrowser Marketplace',
    site: 'https://market.lpm1.top',
    kbModule: 'market',
    identities: [
      {
        name: '平台管理员',
        cred: 'superadmin / 123456',
        cases: [
          {
            title: '登录管理后台',
            steps: ['打开 /admin', '输入 superadmin / 123456', '点击登录'],
            verify: '进入管理后台',
          },
          {
            title: '插件审核（approve/reject）',
            steps: ['进入插件管理页', '查看待审核列表', '点击 approve 或 reject'],
            verify: '插件状态变更',
          },
          {
            title: '插件上架/下架',
            steps: ['进入插件管理页', '操作上架/下架按钮'],
            verify: '插件可见性变更',
          },
        ],
      },
      {
        name: '开发者',
        cred: '注册后登录',
        cases: [
          {
            title: '注册开发者账号',
            steps: ['打开注册页', '填写用户名/邮箱/密码', '提交'],
            verify: '注册成功跳转登录',
          },
          {
            title: '提交插件',
            steps: ['登录后点击 Publish', '填写插件信息（名称/描述/版本/仓库）', '提交'],
            verify: '插件进入 pending 审核状态',
          },
          {
            title: '查看审核状态',
            steps: ['进入 Developer 页面', '查看自己的插件列表'],
            verify: '显示各插件的 pending/approved/rejected 状态',
          },
        ],
      },
      {
        name: '用户/浏览器用户',
        cred: '注册后登录',
        cases: [
          {
            title: '浏览插件市场',
            steps: ['打开首页'],
            verify: '插件卡片渲染（Auth Guard / AI Helper）',
            shot: 'matrix/market/market-01.png',
          },
          {
            title: '搜索插件',
            steps: ['点击导航 Search', '输入 auth', '提交搜索'],
            verify: 'Found 1 results，仅 Auth Guard',
            shot: 'matrix/market/market-03-search-auth.png',
          },
          {
            title: '查看插件详情',
            steps: ['点击 Auth Guard 卡片'],
            verify: '详情页显示 approved/Featured/v1.0.0',
            shot: 'matrix/market/market-04-auth-guard-detail.png',
          },
          {
            title: '安装插件',
            steps: ['在详情页点击 Install Plugin'],
            verify: '后端 POST 200（UI 反馈为已知缺陷）',
            shot: 'matrix/market/market-05-install-click.png',
          },
          {
            title: '写评论（逆向：静默失败）',
            steps: ['在详情页评论表单填写 5 星+标题+正文', '点击提交'],
            verify: '⚠ POST 404 Plugin not found，UI 清空表单假装成功（已知缺陷）',
            shot: 'matrix/market/market-07-review-after-submit.png',
          },
        ],
      },
      {
        name: '游客（未登录）',
        cred: '无需登录',
        cases: [
          {
            title: '浏览插件列表',
            steps: ['直接打开首页'],
            verify: '插件卡片可见',
            shot: 'matrix/market/market-01.png',
          },
          {
            title: '搜索（不需登录）',
            steps: ['点击 Search', '输入关键词', '提交'],
            verify: '搜索结果正常',
            shot: 'matrix/market/market-03-search-auth.png',
          },
          {
            title: '空结果态',
            steps: ['搜索不存在的词 zzzqqq'],
            verify: '显示 No results for zzzqqq',
          },
        ],
      },
    ],
  },
  {
    id: 'forum',
    name: 'Forum',
    site: 'https://forum.lpm1.top',
    kbModule: 'forum',
    identities: [
      {
        name: '管理员',
        cred: 'superadmin / 123456',
        cases: [
          {
            title: '内容新建/编辑/发布',
            steps: ['登录管理后台', '进入内容管理', '新建内容 → 填写 → 发布'],
            verify: '内容状态变为 published',
          },
          {
            title: '用户管理',
            steps: ['进入用户管理页'],
            verify: '用户列表正常渲染',
          },
          {
            title: '系统设置',
            steps: ['进入系统设置页'],
            verify: '表单带出真实配置值',
          },
        ],
      },
      {
        name: '注册用户',
        cred: 'member@community.dev（预填）',
        cases: [
          {
            title: '注册/登录',
            steps: ['打开 /register', '填写表单', '提交', '登录'],
            verify: '注册→登录成功',
            shot: 'matrix/forum/06-register.png',
          },
          {
            title: '浏览全部内容',
            steps: ['打开首页'],
            verify: '全部已发布内容可见',
            shot: 'matrix/forum/01-home.png',
          },
          {
            title: '分类筛选',
            steps: ['点击"文章"筛选胶囊'],
            verify: '列表缩至仅文章类',
            shot: 'matrix/forum/02-filter-article.png',
          },
          {
            title: '搜索',
            steps: ['输入 ISR', '点击搜索'],
            verify: '命中 ISR 教程',
            shot: 'matrix/forum/03-search-isr.png',
          },
          {
            title: '查看内容详情',
            steps: ['点击内容卡片'],
            verify: '详情页完整（面包屑/正文/返回）',
            shot: 'matrix/forum/04-detail-welcome.png',
          },
        ],
      },
      {
        name: '游客（未登录）',
        cred: '无需登录',
        cases: [
          {
            title: '浏览内容列表',
            steps: ['直接打开首页'],
            verify: '公开内容可见',
            shot: 'matrix/forum/01-home.png',
          },
          {
            title: '发帖/评论被拒',
            steps: ['尝试发帖或评论（需登录）'],
            verify: '被要求登录',
          },
        ],
      },
    ],
  },
  {
    id: 'ecommerce',
    name: 'Ecommerce',
    site: 'https://shop.lpm1.top',
    kbModule: 'preset-sites',
    identities: [
      {
        name: '游客/消费者（唯一身份）',
        cred: '无需登录（此形态无 auth 模块）',
        cases: [
          {
            title: '浏览内容中心',
            steps: ['直接打开首页'],
            verify: '内容卡片 + 分类 tab + 搜索框',
            shot: 'matrix/shop/shop-01.png',
          },
          {
            title: '分类筛选',
            steps: ['点击"教程"分类 tab'],
            verify: '列表缩至仅教程类',
            shot: 'matrix/shop/shop-02.png',
          },
          {
            title: '搜索',
            steps: ['输入 ISR', '点击搜索'],
            verify: '命中 ISR 教程',
            shot: 'matrix/shop/shop-03.png',
          },
          {
            title: '查看内容详情',
            steps: ['点击内容卡片'],
            verify: '详情页完整',
            shot: 'matrix/shop/shop-04.png',
          },
          {
            title: '购物车页面',
            steps: ['点击导航 Cart'],
            verify: 'mock 商品 + Order Summary + Checkout 按钮',
            shot: 'matrix/shop/shop-06.png',
          },
          {
            title: '订单页面',
            steps: ['点击导航 Orders'],
            verify: 'mock 订单列表 + 状态筛选',
            shot: 'matrix/shop/shop-05.png',
          },
        ],
      },
    ],
  },
  {
    id: 'minimal',
    name: 'Minimal',
    site: 'https://minimal.lpm1.top',
    kbModule: 'preset-sites',
    identities: [
      {
        name: '游客（唯一身份，无认证模块）',
        cred: '无需登录',
        cases: [
          {
            title: '浏览 todos 列表',
            steps: ['直接打开首页'],
            verify: 'Todos 列表 + 极简导航（仅 Biomimic+Todos）',
            shot: 'matrix/minimal/01-home.png',
          },
          {
            title: '新增 todo',
            steps: ['在输入框填写标题', '点击 Add'],
            verify: 'Total +1，新条目置顶',
            shot: 'matrix/minimal/02-add-new.png',
          },
        ],
      },
    ],
  },
  {
    id: 'cli-only',
    name: 'CLI Only',
    site: '',
    kbModule: 'preset-sites',
    identities: [
      {
        name: 'CLI 用户（唯一身份）',
        cred: '通过 CLI 登录',
        cases: [
          {
            title: 'CLI 命令',
            steps: ['npm run cli -- --help', '运行 todos list 等命令'],
            verify: '命令输出正常',
          },
          {
            title: 'API 调用',
            steps: ['curl http://localhost:3010/api/todos'],
            verify: 'API 返回 JSON 数据',
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

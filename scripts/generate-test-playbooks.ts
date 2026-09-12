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
          {
            title: '超管工作台全景（2026-09-12 补拍）',
            steps: ['superadmin/admin123 登录 /tenant/login'],
            verify: '四统计卡正常；P3：Total Users=1 与成员视角=4 矛盾',
            shot: 'matrix/saas/tadmin/t-11-dashboard.png',
          },
          {
            title: '租户列表页（逆向：UI 缺失）',
            steps: ['探测 /tenant/tenants 与 /admin'],
            verify: '⚠ P2：无租户列表页（回退控制台壳），但 GET /api/tenants 200 数据在',
            shot: 'matrix/saas/tadmin/t-12-tenants-list-missing.png',
          },
          {
            title: '成员管理表（超管视角）',
            steps: ['访问 /tenant/users'],
            verify: 'Members 表 4 行 + Role/Remove + Invite；已知 P3：Joined=Invalid Date',
            shot: 'matrix/saas/tadmin/t-13-tenant-members.png',
          },
          {
            title: '审计日志页（逆向：无 UI 无租户维度）',
            steps: ['探测 /tenant/audit /tenant/audit-logs /tenant/logs'],
            verify: '⚠ P2：三路由全回退壳无内容；API 仅全局 /api/audit-logs 可达',
            shot: 'matrix/saas/tadmin/t-14-audit-logs-missing.png',
          },
        ],
      },
      {
        name: '租户成员',
        cred: 'member-matrix@demo.io（/tenant/login UI 登录）',
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
          {
            title: '成员视角工作台（2026-09-12 补拍）',
            steps: ['成员登录 /tenant/login'],
            verify: '落地 dashboard，按用户隔离（A Todos=0）；P3：顶栏写死 Tenant Admin',
            shot: 'matrix/saas/member/m-10-workbench.png',
          },
          {
            title: '成员视角数据页',
            steps: ['访问 /tenant/todos'],
            verify: 'No data（用户隔离）；⚠ 管理入口 +Add Todo 未按权限隐藏',
            shot: 'matrix/saas/member/m-11-data-todos.png',
          },
          {
            title: '越权邀请（逆向：前端静默吞 403）',
            steps: ['成员提交邀请表单'],
            verify: '⚠ P2 BUG：UI 零反馈静默失败（后端 403 正确，前端不提示）',
            shot: 'matrix/saas/member/m-12-permission-denied.png',
            selectors: {
              邮箱输入框: '#email',
              发送按钮: "find text 'Send invitation'",
            },
          },
          {
            title: '成员访问租户设置（逆向：越权可写）',
            steps: ['成员身份访问 /tenant/settings'],
            verify: '⚠ P2 BUG：Tenant Name 可编辑可保存（成员可改租户名）',
            shot: 'matrix/saas/member/m-13-settings.png',
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
          {
            title: '门户首页全貌（2026-09-12 补拍）',
            steps: ['打开 /（未登录）'],
            verify: 'SPA 重定向 /todos，落地页完整（导航/Todos/SSE Demo/Sign In+Sign Up）',
            shot: 'matrix/saas/guest/g-03-home-landing.png',
          },
          {
            title: '直访 /tenant/console 拦截',
            steps: ['未登录打开 /tenant/console'],
            verify: 'TenantGuard 拦回 /tenant/login 登录卡',
            shot: 'matrix/saas/guest/g-04-console-redirect.png',
          },
          {
            title: '注册页表单',
            steps: ['打开 /register'],
            verify: 'Create Account 卡完整；注意 SPA 自动播种 Demo User 怪癖',
            shot: 'matrix/saas/guest/g-05-register.png',
          },
          {
            title: '忘记密码入口探测（逆向：全线缺失）',
            steps: ['/login /register /tenant/login 三页文本探测 forgot/help/reset'],
            verify: '⚠ 缺口：全站无忘记密码/帮助入口（SKIP 记录）',
          },
          {
            title: '游客首页移动版（375px）',
            steps: ['切 375x812 视口打开首页'],
            verify: '纵向堆叠正常；⚠ P3：375px 页头隐藏，游客看不到登录入口',
            shot: 'matrix/saas/guest/g-15-home-mobile.png',
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
        cred: 'superadmin / 123456（/admin 快速登录）',
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
          {
            title: '管理后台登录页（快速登录三按钮）',
            steps: ['打开 /admin/login'],
            verify: '中文后台 + 超级管理员/客服人员/普通用户快速登录按钮',
            shot: 'matrix/market/market-21-admin-login.png',
          },
          {
            title: '管理员仪表盘',
            steps: ['快速登录超级管理员'],
            verify: '统计卡/菜单/测试通知正常；P3：最后更新显示原始 ISO 时间戳',
            shot: 'matrix/market/market-21b-admin-dashboard.png',
          },
          {
            title: '管理员内容列表',
            steps: ['进入内容列表'],
            verify: '2 条种子内容 + 编辑操作正常',
            shot: 'matrix/market/market-21c-admin-content-list.png',
          },
        ],
      },
      {
        name: '开发者',
        cred: '注册后登录（注意：登录页预填 developer@pluginhub.io 实际无效）',
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
          {
            title: '开发者控制台角色守卫（逆向）',
            steps: ['普通用户登录后访问 /developer'],
            verify: '⚠ P2：静默弹回 /login，无任何权限提示',
            shot: 'matrix/market/market-20-developer-guard-redirect-login.png',
          },
          {
            title: '直连 /developer URL 守卫确认',
            steps: ['地址栏直接输入 /developer'],
            verify: '同样弹回 /login（角色守卫生效但无提示）',
            shot: 'matrix/market/market-20c-developer-direct-url-redirect.png',
          },
          {
            title: '/publish 发布表单（普通用户可访问）',
            steps: ['登录态访问 /publish'],
            verify: '完整表单（名称/Slug/描述/仓库/NPM/License）可访问',
            shot: 'matrix/market/market-20d-publish-form.png',
          },
          {
            title: 'demo 预填凭据登录（逆向）',
            steps: ['/login 直接用预填 developer@pluginhub.io 登录'],
            verify: '⚠ P2：预填凭据报 Invalid credentials（demo 凭据失效）',
            shot: 'matrix/market/market-20b-demo-credentials-invalid.png',
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
          {
            title: '注册并登录（2026-09-12 补拍）',
            steps: ['注册 markettest0912@t.com', '登录'],
            verify: '右上角显示 markettest0912（⚠ 落地 /todos 404 为已知 P2）',
            shot: 'matrix/market/market-16b-logged-in-home.png',
          },
          {
            title: '登录后落地页（逆向：404）',
            steps: ['登录成功观察跳转'],
            verify: '⚠ P2 BUG：跳 /todos 渲染 404（冷会话稳定复现）',
            shot: 'matrix/market/market-16-postlogin-404.png',
          },
          {
            title: '登录态点 Install（逆向：零反馈）',
            steps: ['登录态在详情页点 Install Plugin'],
            verify: '⚠ P1 BUG：按钮/计数/URL 全无变化，登录态同样复现',
            shot: 'matrix/market/market-17-install-logged-in-no-change.png',
          },
          {
            title: '评论提交后刷新验证（逆向：未入库）',
            steps: ['提交评论后 F5 刷新'],
            verify: '⚠ P1 BUG：刷新后仍 No reviews yet，评论未持久化',
            shot: 'matrix/market/market-18b-review-after-reload.png',
          },
          {
            title: '个人中心（逆向：硬编码 + 入口缺失）',
            steps: ['访问 /profile', '探测 /account /me /installed /my-plugins'],
            verify: '⚠ P2：profile 硬编码 Jane Doe；全站无"我的安装"页',
            shot: 'matrix/market/market-19-profile-janedoe-hardcoded.png',
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
          {
            title: '首页完整卡片墙（真实游客态，2026-09-12 补拍）',
            steps: ['Sign Out 后打开首页'],
            verify: '卡片墙 + 分类侧栏 + Login 入口',
            shot: 'matrix/market/market-10.png',
          },
          {
            title: '分类筛选（逆向：no-op）',
            steps: ['点击分类侧栏"工具"'],
            verify: '⚠ P1 BUG：列表不变（API payload 无 category 字段），仅 chip 高亮',
            shot: 'matrix/market/market-11.png',
          },
          {
            title: '搜索 "ai" 结果页',
            steps: ['搜索 ai'],
            verify: 'Found 1 results → AI Helper；P3：chip 状态泄漏高亮',
            shot: 'matrix/market/market-12.png',
          },
          {
            title: '详情页上半部',
            steps: ['打开插件详情'],
            verify: '描述/评分/作者/徽章齐全；P3：发布日期 1970/1/1',
            shot: 'matrix/market/market-13.png',
          },
          {
            title: '详情页下半部（评论区 + 版本历史探测）',
            steps: ['详情页滚动到底'],
            verify: 'Reviews(0) 空态 + 评论表单；缺口：版本历史区块不存在',
            shot: 'matrix/market/market-14.png',
          },
          {
            title: '游客点 Install（逆向：零反馈不鉴权）',
            steps: ['未登录点 Install Plugin'],
            verify: '⚠ P1 BUG：无任何反应也不跳登录（URL/按钮/计数全不变）',
            shot: 'matrix/market/market-15.png',
          },
          {
            title: '登录页（游客入口）',
            steps: ['点导航 Login'],
            verify: '/login 渲染正常（预填凭据问题另案）',
            shot: 'matrix/market/market-15b-login-page.png',
          },
          {
            title: '移动端首页（375px）',
            steps: ['切 375x812 视口打开首页'],
            verify: 'hero/CTA/卡片/底部 tab（Discover/Plugins/Categories/Search/My）完整',
            shot: 'matrix/market/market-22-mobile-home.png',
          },
          {
            title: '移动端详情页',
            steps: ['375px 打开详情'],
            verify: 'hero/Install/评分/评论表单完整',
            shot: 'matrix/market/market-23-mobile-detail.png',
          },
          {
            title: '移动端搜索结果',
            steps: ['375px 搜索 ai'],
            verify: 'Found 1 results + Search tab 高亮',
            shot: 'matrix/market/market-24-mobile-search.png',
          },
          {
            title: '硬刷新详情页（边界）',
            steps: ['详情页直连 URL 冷加载'],
            verify: '无白屏无 hydration 错误；注意头部身份漂移怪癖（显示 Demo User）',
            shot: 'matrix/market/market-25-hard-refresh-detail.png',
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
        cred: 'member@community.dev（预填，直接点 Sign In）',
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
          {
            title: '登录后首页身份展示（2026-09-12 补拍）',
            steps: ['/login 点 Sign In（预填凭据）', '回到首页'],
            verify: 'navbar 显示 Demo User + Sign Out，2 卡正常',
            shot: 'matrix/forum/forum-10.png',
            selectors: { 登出按钮: 'button.text-xs' },
          },
          {
            title: '登录后详情页评论区探测',
            steps: ['登录态打开内容详情页'],
            verify: '⚠ 缺口：评论区整体不存在（无输入框/无评论文案）',
            shot: 'matrix/forum/forum-21.png',
          },
          {
            title: 'Profile 登录后内容（逆向：硬编码）',
            steps: ['登录态访问 /profile'],
            verify: '⚠ BUG：与游客态相同的 Jane Doe 硬编码档案，与登录身份无关',
            shot: 'matrix/forum/forum-23.png',
          },
          {
            title: '登录落地死路（逆向）',
            steps: ['在 /login 点击 Sign In 观察跳转'],
            verify: '⚠ P1 BUG：登录成功跳 /todos → forum preset 无此路由 404',
            shot: 'matrix/forum/forum-29.png',
          },
          {
            title: '硬刷新详情页（SSR 水合验证）',
            steps: ['详情页 F5', '300ms 与 1200ms 双探针'],
            verify: '300ms 内容完整无白屏；__SSR_DATA__ 水合后移除',
            shot: 'matrix/forum/forum-27.png',
          },
          {
            title: '登出后首页',
            steps: ['点击 Sign Out'],
            verify: 'navbar 变 Login，列表内容不受影响',
            shot: 'matrix/forum/forum-28.png',
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
          {
            title: '首页全景（2026-09-12 补拍）',
            steps: ['直接打开首页，等待渲染'],
            verify: '标题/筛选胶囊/搜索框/2 张卡片完整',
            shot: 'matrix/forum/forum-10.png',
          },
          {
            title: '筛选"文章"类',
            steps: ['点击第 2 个筛选胶囊'],
            verify: '胶囊高亮，仅 1 卡（欢迎文章）',
            shot: 'matrix/forum/forum-11.png',
            selectors: { 筛选胶囊: 'div.flex.gap-2.flex-wrap button:nth-of-type(2)' },
          },
          {
            title: '搜索 ISR',
            steps: ['先点回"全部"再搜索 ISR（搜索不重置分类）'],
            verify: '仅 ISR 教程卡',
            shot: 'matrix/forum/forum-12.png',
          },
          {
            title: '详情页全貌',
            steps: ['点开欢迎文章进详情'],
            verify: '面包屑/徽标/正文完整；徽标显示原始 key 未本地化（已知）',
            shot: 'matrix/forum/forum-13.png',
          },
          {
            title: 'Topics 页',
            steps: ['导航点击 Topics'],
            verify: '⚠ 与首页完全相同（复用内容中心，无独立话题视图）',
            shot: 'matrix/forum/forum-14.png',
          },
          {
            title: 'Popular 页',
            steps: ['导航点击 Popular'],
            verify: '⚠ 与首页完全相同，数据全 0 排序无可见效果',
            shot: 'matrix/forum/forum-15.png',
          },
          {
            title: 'Profile 无鉴权守卫（逆向）',
            steps: ['登出后访问 /profile'],
            verify: '⚠ BUG：无守卫直接渲染 Jane Doe 硬编码档案',
            shot: 'matrix/forum/forum-16.png',
          },
          {
            title: '登录页（逆向：假报错）',
            steps: ['直接打开 /login 不做任何操作'],
            verify: '⚠ P1 BUG：加载即显示 Invalid credentials（未提交过）',
            shot: 'matrix/forum/forum-17.png',
          },
          {
            title: '注册页表单',
            steps: ['从登录页点 Sign up 链接'],
            verify: 'Create Account 表单完整（min 6 chars 校验提示）',
            shot: 'matrix/forum/forum-18.png',
            selectors: { 注册链接: "[data-testid='login-register-link']" },
          },
          {
            title: '404 路由兜底',
            steps: ['访问 /no-such-page-xyz'],
            verify: 'HTTP 200 灰字 404；P3：无返回首页链接',
            shot: 'matrix/forum/forum-19.png',
          },
          {
            title: '移动端首页（375px）',
            steps: ['切 375x812 视口', '打开首页'],
            verify: '胶囊换行/搜索堆叠/无横向溢出；⚠ 移动端无登录登出入口',
            shot: 'matrix/forum/forum-24-mobile.png',
          },
          {
            title: '移动端详情页',
            steps: ['375px 打开详情'],
            verify: '纵向堆叠正常，底部 tab 正常',
            shot: 'matrix/forum/forum-25-mobile.png',
          },
          {
            title: '移动端登录页（假报错复现）',
            steps: ['375px 打开 /login'],
            verify: '⚠ 同桌面：加载即 Invalid credentials',
            shot: 'matrix/forum/forum-26-mobile.png',
          },
          {
            title: '登录横幅桌面复现 + 成功登录对照',
            steps: ['桌面打开 /login 截假报错', '同凭据点 Sign In'],
            verify: '假报错存在但手动登录成功（自动鉴权尝试失败泄入 UI）',
            shot: 'matrix/forum/forum-30.png',
          },
          {
            title: '空分类筛选空态',
            steps: ['点击"公告"胶囊'],
            verify: '显示"暂无内容"空态文案',
            shot: 'matrix/forum/forum-31.png',
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
          {
            title: '首页全景（2026-09-12 补拍）',
            steps: ['直接打开首页，等待 SPA 渲染'],
            verify: '导航 5 项 + 6 个分类 tab + 2 张内容卡片 + 页脚技术栈',
            shot: 'matrix/shop/shop-11.png',
          },
          {
            title: '分类筛选后列表',
            steps: ['点击"教程" tab', '等待列表刷新'],
            verify: '教程 tab 高亮，列表仅剩 1 张 ISR 教程卡',
            shot: 'matrix/shop/shop-12.png',
            selectors: { 分类tab容器: '.flex.gap-2.flex-wrap button:nth-of-type(4)' },
          },
          {
            title: '搜索关键词结果',
            steps: ['输入 ISR', '点击搜索'],
            verify: '1 卡命中，关键词保留在输入框',
            shot: 'matrix/shop/shop-13.png',
            selectors: { 搜索输入框: 'input.px-4', 搜索按钮: 'form > button' },
          },
          {
            title: '内容详情页（逆向：导航高亮错乱）',
            steps: ['点开 ISR 教程进入 /content/content-2'],
            verify: '⚠ BUG：顶部导航 Account 被错误点亮（SSR 直出即带错）',
            shot: 'matrix/shop/shop-14.png',
            selectors: { 详情链接: 'main a[href="/content/content-2"]' },
          },
          {
            title: '购物车实况（数据漂移：非空态）',
            steps: ['点击导航 Cart'],
            verify: '3 行 4 件 mock 商品，Total $188.96，Checkout 可点',
            shot: 'matrix/shop/shop-15.png',
          },
          {
            title: '加入购物车（逆向：入口缺失）',
            steps: ['在购物车页与详情页全量扫描加购/购买按钮'],
            verify: '⚠ BUG：全站无任何加购/购买入口，电商闭环断裂',
            shot: 'matrix/shop/shop-15.png',
          },
          {
            title: '订单页实况（数据漂移：非空态）',
            steps: ['点击导航 Orders'],
            verify: '5 张 mock 订单（ORD-2024-001..005），状态 chips 可筛选',
            shot: 'matrix/shop/shop-17.png',
          },
          {
            title: '404 兜底（逆向：soft-404）',
            steps: ['直接访问 /nonexistent'],
            verify: '⚠ BUG：HTTP 200 纯文本 404，无返回首页 CTA',
            shot: 'matrix/shop/shop-18.png',
          },
          {
            title: '详情页滚动到底（互动区探测）',
            steps: ['在详情页滚动到页面底部'],
            verify: '页面无滚动余量：无评论/推荐/点赞互动区',
            shot: 'matrix/shop/shop-19.png',
          },
          {
            title: '搜索无结果空态',
            steps: ['搜索乱码词 zzqqxx'],
            verify: '0 卡，居中"暂无内容"，关键词保留',
            shot: 'matrix/shop/shop-20.png',
          },
          {
            title: '详情页硬加载（SSR 验证）',
            steps: ['在详情页按 F5 立即截图', '等 2s 截稳定帧对照'],
            verify: '两帧一致：SSR 直出无白屏无骨架屏',
            shot: 'matrix/shop/shop-21.png',
          },
          {
            title: '移动端首页（375px）',
            steps: ['切 375x667 视口', '打开首页'],
            verify: '顶部导航收起，底部 tab 栏（Home/Products/Cart/Orders/Me）',
            shot: 'matrix/shop/shop-22-home-mobile.png',
          },
          {
            title: '移动端详情页（逆向：双高亮）',
            steps: ['375px 打开详情页'],
            verify: '⚠ BUG：Home 与 Me 同时高亮（home 恒高亮硬编码）；meta 中文拆行',
            shot: 'matrix/shop/shop-23-detail-mobile.png',
          },
          {
            title: '移动端购物车（底部 tab 导航）',
            steps: ['点击 bottom-tab-cart'],
            verify: '购物车完整渲染，qty 步进器可用；Home 仍恒高亮',
            shot: 'matrix/shop/shop-24-cart-mobile.png',
            selectors: { 底部tab购物车: "[data-testid='bottom-tab-cart']" },
          },
          {
            title: '移动端导航形态实证',
            steps: ['点击 bottom-tab-orders'],
            verify: '⚠ BUG 实证：home tab inline style 恒高亮（computed style 双橙）',
            shot: 'matrix/shop/shop-25-nav-mobile.png',
            selectors: { 底部tab订单: "[data-testid='bottom-tab-orders']" },
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
          {
            title: '输入中状态（按钮可用性）',
            steps: ['聚焦输入框并输入标题（不提交）'],
            verify: 'Add Todo 由 disabled 变可用',
            shot: 'matrix/minimal/minimal-06-add-input.png',
            selectors: {
              输入框: "[data-testid='todo-title-input']",
              添加按钮: "[data-testid='add-todo-button']",
            },
          },
          {
            title: '新增后列表置顶',
            steps: ['提交新增'],
            verify: '新条目置顶，Total 12→13，输入框清空',
            shot: 'matrix/minimal/minimal-07-added-top.png',
          },
          {
            title: '状态切换为 completed',
            steps: ['下拉选择 completed'],
            verify: '卡片变绿 + 标题划线 + 绿勾',
            shot: 'matrix/minimal/minimal-08-completed.png',
          },
          {
            title: '删除条目',
            steps: ['点击删除'],
            verify: '立即移除（无确认弹窗），Total 13→12',
            shot: 'matrix/minimal/minimal-09-after-delete.png',
          },
          {
            title: '移动端 375px',
            steps: ['切 375x812 视口', '打开首页'],
            verify: '无横向溢出；已知 P3：过滤 chips 右缘截断',
            shot: 'matrix/minimal/minimal-10-home-mobile.png',
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

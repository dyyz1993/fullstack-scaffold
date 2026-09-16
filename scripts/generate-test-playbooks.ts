/**
 * Test Playbook 生成器：为每个 preset 生成身份→案例→步骤→截图→选择器的完整测试手册。
 * 数据源：generate-preset-docs.ts 的 META（身份）+ .ui-tester/knowledge/<模块>/selectors.yml（选择器）
 *        + docs/PRESETS/screenshots/（截图）
 * 输出：docs/PRESETS/playbooks/<preset>.md
 * 运行：npx tsx scripts/generate-test-playbooks.ts
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs'
import { join } from 'path'
import { EXTRA_CHAINS } from './playbook-chains-forum-market'

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
          {
            title: '验证码限流触发（逆向防御验证）',
            shot: 'matrix/fullstack/superadmin-01-captcha-modal.png',
            steps: ['打开 /admin/test/captcha 验证码测试页', '点击"连续请求 20 次"'],
            verify: '真实弹出验证码 Modal；输入正确码提交后弹窗关闭（响应链闭环）',
          },
          {
            title: '空标题内容创建被拒（逆向）',
            shot: 'matrix/fullstack/superadmin-02-empty-title-rejected.png',
            steps: ['内容管理 → 新建内容', '不填标题直接提交'],
            verify: '表单/zod 校验拦截并提示必填，不产生脏数据',
          },
          {
            title: '未登录访问管理 API（逆向）',
            shot: 'matrix/fullstack/superadmin-09-api-unauth-fake-token-401.png',
            steps: ['不带 Authorization 请求 /api/admin/stats'],
            verify: '返回 401，不泄露任何统计',
          },
          {
            title: '内容编辑后改回原样（正向链）',
            steps: [
              '内容管理 → 内容列表，点击行内"编辑"按钮',
              '修改标题后点击 OK 保存',
              '再次编辑同一行，改回原标题后 OK 保存',
            ],
            verify: '表格标题先更新后恢复原值，状态保持已发布，无多余行',
            shot: 'matrix/fullstack/super-admin/fa-admin-content.png',
            selectors: {
              编辑按钮: "find text '编辑' --action click",
              弹窗确认: "find text 'OK' --action click",
            },
          },
          {
            title: '系统设置修改后还原（正向链）',
            steps: [
              '系统管理 → 系统设置，修改站点名称为 QA-Temp-Name',
              '点击"保存更改"',
              '改回原值 Biomimic Admin 再次保存',
            ],
            verify: '两次均出现"设置保存成功!" toast，GET /api/admin/settings 回读 siteName 为原值',
            shot: 'matrix/fullstack/super-admin/fa-admin-settings.png',
            selectors: {
              站点名称输入框: ".ant-layout-content input[placeholder='请输入站点名称']",
              保存按钮: "find text '保存更改' --action click",
            },
          },
          {
            title: '仪表盘刷新后统计保持（正向）',
            steps: ['登录到达 /admin/dashboard 记录统计卡数值', '按 F5 硬刷新'],
            verify: '刷新后统计卡与刷新前一致（GET /api/admin/stats 200），无清零',
            shot: 'verify/verify-admin-dashboard.png',
          },
          {
            title: '订单/工单/纠纷空数据页巡检（正向边界）',
            steps: ['依次访问 /admin/orders、/admin/tickets、/admin/disputes'],
            verify: '三页壳与表格头渲染正常，统计卡全 0 + No data（线上无 mock 数据），无报错',
            shot: 'matrix/fullstack/super-admin/fa-admin-orders.png',
          },
          {
            title: '分类管理与权限页深链（边界实勘）',
            steps: ['直接打开 /admin/categories', '再直接打开 /admin/permissions'],
            verify:
              '实勘：categories 超管侧渲染情况未采样（API /api/categories 200 有数据）；permissions 深链 200 但内容区空白（已知缺陷）——逐页记录',
            shot: 'matrix/fullstack/super-admin/fa-admin-categories.png',
          },
          {
            title: 'emoji/中英混合标题正常创建（正向）',
            shot: 'matrix/fullstack/superadmin-03-emoji-title-created.png',
            steps: [
              '内容列表点击"创建内容"',
              '标题输入 🎉 Release Notes 发布v2 中英混合，填写其余必填项提交',
              '确认后删除该条清理',
            ],
            verify: '列表正常渲染该条无乱码无报错，清理后列表恢复基线',
          },
          {
            title: '连续创建 3 条内容（正向批量链）',
            shot: 'matrix/fullstack/superadmin-04-batch3-created.png',
            steps: ['连续点击"创建内容"新建 3 条不同标题的内容并逐一提交', '记录列表新增数量'],
            verify: '3 条均出现在列表，随后全部删除清理，列表回到基线',
          },
          {
            title: '超长标题提交（逆向）',
            shot: 'matrix/fullstack/superadmin-05-long-title-accepted.png',
            steps: ['点击"创建内容"', '标题粘贴 256+ 字符长串，提交'],
            verify: '实勘：被长度校验拒绝则提示报错；若接受则正常入库显示——记录行为，前端不崩溃',
          },
          {
            title: '纯空格标题提交被拒（逆向）',
            shot: 'matrix/fullstack/superadmin-06-whitespace-title-BUG-accepted.png',
            steps: ['点击"创建内容"', '标题只输入多个空格，提交'],
            verify: '校验拦截（trim 后按必填处理），不产生空标题脏数据',
          },
          {
            title: 'XSS 注入标题转义验证（逆向）',
            shot: 'matrix/fullstack/superadmin-07-xss-title-escaped.png',
            steps: [
              '点击"创建内容"',
              '标题输入 <script>alert(1)</script>，提交',
              '回到列表查看该条渲染',
            ],
            verify: '标题按纯文本渲染不执行（无弹窗），列表与详情均无脚本注入效果',
          },
          {
            title: '伪造 Bearer token 调管理 API（逆向）',
            shot: 'matrix/fullstack/superadmin-09-api-unauth-fake-token-401.png',
            steps: ['curl -H "Authorization: Bearer fake-token123" 请求 /api/admin/stats'],
            verify: '返回 401，伪造 token 不被接受（仅预置 mock token 可用）',
          },
          {
            title: '双击创建内容提交防重（逆向）',
            shot: 'matrix/fullstack/superadmin-08-dblclick-dup-BUG.png',
            steps: ['填写完整创建表单后快速双击 OK 提交按钮'],
            verify: '实勘：仅创建 1 条（若出现重复行记录为缺陷），随后清理',
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
          {
            title: '客服登出（正向链）',
            shot: 'matrix/fullstack/cs-02-logout-back-to-login.png',
            steps: ['登录后点击 header 头像下拉', '点击"退出登录"'],
            verify: '跳回 /admin/login，重新进入后台需再次登录（customer-service-token 登出）',
          },
          {
            title: '客服刷新后只读权限保持（正向）',
            steps: ['进入 /admin/content 后按 F5 硬刷新'],
            verify: '刷新后仍无"创建内容"按钮、行内无编辑按钮（只读态持久）',
            shot: 'matrix/fullstack/cs-full/cs-full-02-content-readonly-with-data.png',
          },
          {
            title: '客服伪造角色提权（逆向）',
            shot: 'matrix/fullstack/cs-01-forged-role-still-403.png',
            steps: [
              'localStorage 把 admin-storage 的 user.role 改为 super_admin',
              '刷新后请求 /api/admin/users',
            ],
            verify: '后端按 token 鉴权仍 403 Permission denied，前端角色字段篡改不提权',
          },
          {
            title: '客服保存系统设置被拦截（逆向）',
            steps: ['进入系统设置（表单空，GET 403）', '点击"保存更改"'],
            verify: '保存被拦截（验证码/403），无任何配置变更落库',
            shot: 'matrix/fullstack/cs-05-settings-save-blocked-by-captcha.png',
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
          {
            title: '普通用户登出（正向链）',
            shot: 'matrix/fullstack/user-02-logout-back-to-login.png',
            steps: ['登录后打开头像下拉', '点击"退出登录"'],
            verify: '跳回 /admin/login，user-token 登出',
          },
          {
            title: '普通用户 token 直调管理 API（逆向）',
            shot: 'matrix/fullstack/user-01-token-api-403.png',
            steps: [
              'curl -H "Authorization: Bearer user-token" 请求 /api/admin/stats 与 /api/admin/users',
            ],
            verify: '均 403 Permission denied，与 UI 空数据一致（token 合法但无权限）',
          },
          {
            title: '角色切换下拉提权链（逆向·已知缺陷复现）',
            steps: ['登录后点击 header 角色切换下拉', '选择"超级管理员"'],
            verify:
              '⚠ 已知缺陷：admin-storage 的 user+token 被整体替换为目标角色（提权链）；记录切换后可访问的页面与 API，不作为通过标准',
            shot: 'matrix/fullstack/user-05-role-switcher-dropdown.png',
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
            shot: 'matrix/fullstack/guest-01-todos-auto-login-write.png',
            steps: ['在 /todos 页尝试新增（需登录态）'],
            verify: '游客自动登录（dev token），无需手动认证',
          },
          {
            title: '访问 /admin 被重定向',
            steps: ['直接打开 https://fullstack.lpm1.top/admin'],
            verify: '302 → /admin/login 登录页',
            shot: 'verify/verify-admin-login.png',
          },
          {
            title: '游客刷新 /todos 后 SSR 数据保持（正向）',
            steps: ['打开 /todos 记录渲染内容', '按 F5 硬刷新'],
            verify: '刷新后 Todo List 与 SSR 数据仍完整渲染（window.__SSR_DATA__.todos），无空白',
            shot: 'verify/verify-todos.png',
          },
          {
            title: '伪造 token 调 todos 写接口（逆向）',
            shot: 'matrix/fullstack/guest-02-fake-token-post-401.png',
            steps: ['curl -X POST -H "Authorization: Bearer fake-token123" 请求 /api/todos'],
            verify: '返回 401，不产生任何待办数据',
          },
          {
            title: '游客深链 /admin/users 被拦（逆向）',
            steps: ['未登录直接打开 https://fullstack.lpm1.top/admin/users'],
            verify: '302 重定向到 /admin/login，不渲染任何用户数据',
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
            title: '平台租户列表页（已补建·正向复验）',
            steps: ['超管登录后访问 /tenant/tenants'],
            verify:
              '✅ 已补建（第三轮）：租户表格渲染全部租户（名称/套餐/状态 Tag），终验 9 行 PASS',
            shot: 'matrix/saas/tadmin/t-12-tenants-list.png',
          },
          {
            title: '成员管理表（超管视角）',
            steps: ['访问 /tenant/users'],
            verify: 'Members 表 4 行 + Role/Remove + Invite；已知 P3：Joined=Invalid Date',
            shot: 'matrix/saas/tadmin/t-13-tenant-members.png',
          },
          {
            title: '审计日志页（已补建·全局维度）',
            steps: ['超管登录后访问 /tenant/audit'],
            verify:
              '✅ 已补建（第三轮）：审计表格渲染（时间/用户/操作/资源/IP），终验 20 行 PASS；租户维度过滤仍为待定项',
            shot: 'matrix/saas/tadmin/t-14-audit-logs.png',
          },
          {
            title: '平台租户列表查看',
            steps: ['超管登录后侧栏点击"平台租户"（/tenant/tenants）'],
            verify: '租户表格渲染全部租户（名称/套餐/状态 Tag）',
            shot: 'matrix/saas/tadmin/t-12-tenants-list.png',
          },
          {
            title: '平台审计日志查看',
            steps: ['侧栏点击"审计日志"（/tenant/audit）'],
            verify: '审计表格渲染（时间/用户/操作/资源/IP），分页可用',
            shot: 'matrix/saas/tadmin/t-14-audit-logs.png',
          },
          {
            title: '邀请无效邮箱被拒（逆向）',
            shot: 'matrix/saas/tadmin-01-invite-invalid-email.png',
            steps: ['Invite member 填入非法格式邮箱提交'],
            verify: '表单/后端校验拦截，提示格式错误，不产生邀请',
          },
          {
            title: '租户设置修改后还原（正向链）',
            steps: [
              'Settings 页把 Tenant Name 改为 QA-Temp-Name',
              '点击 Save Settings',
              '改回 Saas Demo 再次保存',
            ],
            verify: '两次均 toast "Settings updated successfully"，回读 #name 为 Saas Demo',
            shot: 'matrix/saas/tadmin/a-05-settings.png',
            selectors: { 租户名输入框: '#name', 保存按钮: 'button.ant-btn' },
          },
          {
            title: '仪表盘刷新后统计保持（正向）',
            steps: ['登录后记录 /tenant/dashboard 四统计卡数值', '按 F5 硬刷新'],
            verify: '刷新后四统计卡与刷新前一致（已知口径矛盾另案），无清零',
            shot: 'journeys/saas-j2-dashboard.png',
          },
          {
            title: '平台租户列表渲染与分页探测（正向实勘）',
            steps: ['侧栏点击"平台租户"进入 /tenant/tenants', '检查表格行数、排序与分页控件'],
            verify: '实勘：9 个租户渲染（ID 1..11），分页/排序能力以实勘为准——操作后表格无崩溃',
            shot: 'matrix/saas/tadmin/t-12-tenants-list.png',
            selectors: { 平台租户侧栏链接: "a[href='/tenant/tenants']" },
          },
          {
            title: '审计日志列表与排序探测（正向实勘）',
            steps: ['侧栏点击"审计日志"进入 /tenant/audit', '检查 20 行渲染与操作 tag'],
            verify: '实勘：表格 20 行 + create tag 渲染；排序/分页能力记录，操作后无崩溃',
            shot: 'matrix/saas/tadmin/t-14-audit-logs.png',
            selectors: { 审计日志侧栏链接: "a[href='/tenant/audit']" },
          },
          {
            title: '邀请角色选普通成员（正向链）',
            steps: [
              'Users 页点击 Invite member',
              '填入 invite-member-qa@demo.io',
              '角色下拉选"普通成员"',
              '点击 Send invitation',
            ],
            verify: '绿色 toast "Invitation created"，角色为 tr_saas_member',
            shot: 'matrix/saas/tadmin/a-03a-invite-modal-role-dropdown.png',
            selectors: {
              邮箱输入框: '.ant-modal input.ant-input',
              角色下拉: '.ant-modal .ant-select-selector',
              角色选项: ".ant-select-item-option[title='普通成员']",
              发送按钮: '.ant-modal .ant-btn-primary',
            },
          },
          {
            title: 'Todo 连续创建 3 条（正向批量链）',
            steps: ['进入 /tenant/todos', '连续 + Add Todo 创建 3 条不同标题（OK 提交）'],
            verify: '3 条均出现在管理员列表（管理员可见全部创建者行），随后逐条删除清理',
            shot: 'matrix/saas/tadmin/a-06-todos.png',
            selectors: {
              新增按钮: 'button.ant-btn-primary',
              标题输入框: '#title',
              提交按钮: '.ant-modal .ant-btn-primary',
            },
          },
          {
            title: 'Todo 创建后删除闭环（正向）',
            steps: [
              '+ Add Todo 创建一条 qa-delete-me',
              '行内点击删除按钮',
              'Confirm Delete 弹窗点击 Yes',
            ],
            verify: '确认后该行移除，列表计数回落',
            shot: 'matrix/saas/tadmin/a-06-todos.png',
            selectors: { 删除确认按钮: '.ant-modal-confirm-btns button.ant-btn-primary' },
          },
          {
            title: '超管登出重登（正向链）',
            steps: ['header 用户图标 → Logout', '重新 superadmin/admin123 登录'],
            verify:
              '登出跳 /tenant/login 且 tenant-token/current-tenant-slug 双清空，重登后 dashboard 正常',
            shot: 'journeys/saas-j1-login.png',
          },
          {
            title: '邀请超长邮箱被拒（逆向）',
            shot: 'matrix/saas/tadmin-02-invite-long-email.png',
            steps: ['Invite member 邮箱填入 256+ 字符非法长串', '点击 Send invitation'],
            verify: '表单/后端校验拦截（格式或长度），不产生邀请记录',
          },
          {
            title: '邀请纯空格邮箱被拒（逆向）',
            shot: 'matrix/saas/tadmin-03-invite-space-email.png',
            steps: ['Invite member 邮箱只输入空格', '点击 Send invitation'],
            verify: '校验拦截提示格式错误，不产生邀请',
          },
          {
            title: 'Todo 标题 XSS 注入转义验证（逆向）',
            shot: 'matrix/saas/tadmin-04-todo-xss.png',
            steps: ['+ Add Todo 标题输入 <script>alert(1)</script>', 'OK 提交后查看列表'],
            verify: '标题纯文本渲染不执行（无弹窗），随后删除清理',
            selectors: { 标题输入框: '#title', 提交按钮: '.ant-modal .ant-btn-primary' },
          },
          {
            title: '伪造 Bearer token 调平台 API（逆向）',
            shot: 'matrix/saas/tadmin-05-fake-bearer-api.png',
            steps: ['curl -H "Authorization: Bearer fake-token123" 请求 GET /api/tenants'],
            verify: '返回 401，不泄露租户清单',
          },
          {
            title: '双击 Send invitation 防重（逆向）',
            shot: 'matrix/saas/tadmin-06-invite-dblclick.png',
            steps: ['填写邀请表单后快速双击 Send invitation'],
            verify: '实勘：仅 1 次 toast/1 条邀请（若重复创建记录为缺陷），随后清理',
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
          {
            title: '成员视角无成员管理按钮（RBAC 收敛验证）',
            shot: 'matrix/saas/member-01-users-rbac.png',
            steps: ['成员身份进入 Users 页'],
            verify: '无 Invite member 按钮、成员行无 Role/Remove 操作控件，Role 仅只读徽章',
          },
          {
            title: '成员越权访问平台 API（逆向）',
            shot: 'matrix/saas/member-02-platform-api-403.png',
            steps: ['成员 token 直接请求 GET /api/tenants 与 /api/audit-logs'],
            verify: '均返回 403，不泄露平台级数据',
          },
          {
            title: '成员新增 Todo（正向）',
            steps: ['成员登录进入 /tenant/todos', '+ Add Todo 填写标题提交'],
            verify: 'todo 创建成功且仅自己可见（成员视角 data:create 权限）',
            shot: 'matrix/saas/member/m-05-todos.png',
            selectors: {
              新增按钮: 'button.ant-btn-primary',
              标题输入框: '#title',
              提交按钮: '.ant-modal .ant-btn-primary',
            },
          },
          {
            title: '成员删除自己 Todo（正向闭环）',
            shot: 'matrix/saas/member-03b-member-deleted-todo.png',
            steps: ['在刚创建的 todo 行点击删除', '确认弹窗点击 Yes'],
            verify: '该行移除回到基线，成员数据隔离不波及他人',
            selectors: { 删除确认按钮: '.ant-modal-confirm-btns button.ant-btn-primary' },
          },
          {
            title: '成员登出重登状态保持（正向链）',
            steps: ['header 用户图标 → Logout', '重新以 member-matrix 登录'],
            verify: '重登后仍落地 /tenant/dashboard，数据隔离（A Todos=0）与角色不变',
            shot: 'matrix/saas/member/m-01-dashboard.png',
          },
          {
            title: '成员访问平台租户页（逆向·已知缺陷复现）',
            shot: 'matrix/saas/member-04-tenants-alert.png',
            steps: ['成员身份硬加载 /tenant/tenants'],
            verify:
              '⚠ 已知缺陷：成员亦渲染全量平台租户表（super_admin 鉴权前后端两层均缺）；记录复现，不作为通过标准',
          },
          {
            title: '成员 Todo 超长标题（逆向）',
            shot: 'matrix/saas/member-05-todo-long-title.png',
            steps: ['+ Add Todo 标题粘贴 256+ 字符', 'OK 提交'],
            verify: '实勘：被 zod 长度校验拒绝则提示；接受则正常入列——记录行为，无崩溃',
            selectors: { 标题输入框: '#title', 提交按钮: '.ant-modal .ant-btn-primary' },
          },
          {
            title: '缺 roleId 的邀请 API 被拒（逆向·API 级）',
            shot: 'matrix/saas/member-06-invite-noroleid-400.png',
            steps: ['以成员 JWT POST /api/tenants/5/members/invite，body 只含 email 不含 roleId'],
            verify: '返回 400 ZodError（缺 roleId），不产生邀请；越权邀请 403 另案',
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
            title: '忘记密码入口探测（逆向·产品待定项）',
            steps: ['/login /register /tenant/login 三页文本探测 forgot/help/reset'],
            verify: '三页文本探测 forgot/help/reset 全 false——确认全线无此入口',
            shot: 'matrix/saas/guest/g-06-forgot-password-probe.png',
          },
          {
            title: '游客首页移动版（375px）',
            steps: ['切 375x812 视口打开首页'],
            verify: '纵向堆叠正常；⚠ P3：375px 页头隐藏，游客看不到登录入口',
            shot: 'matrix/saas/guest/g-15-home-mobile.png',
          },
          {
            title: '未登录访问平台 API（逆向）',
            shot: 'matrix/saas/guest-03-api-noauth-401.png',
            steps: ['无 token 请求 GET /api/tenants'],
            verify: '返回 401，不泄露租户清单',
          },
          {
            title: '错误密码登录被拒（逆向）',
            shot: 'matrix/saas/guest-04-wrong-password.png',
            steps: ['/tenant/login 输入 superadmin / wrongpass', '点击 Sign in'],
            verify: '登录失败提示错误，不进入 dashboard，不签发有效 token',
            selectors: {
              账号输入框: '#account',
              密码输入框: '#password',
              登录按钮: 'button.ant-btn',
            },
          },
          {
            title: '纯空格账号登录被拒（逆向）',
            shot: 'matrix/saas/guest-05-space-account.png',
            steps: ['账号输入空格，密码输入任意值', '点击 Sign in'],
            verify: '校验或后端拒绝，停留登录页不进入控制台',
          },
          {
            title: 'XSS 注入登录账号（逆向）',
            shot: 'matrix/saas/guest-06-xss-account.png',
            steps: ['账号输入 <script>alert(1)</script>，密码任意', '点击 Sign in'],
            verify: '错误提示按文本渲染不执行脚本（无弹窗），登录失败',
          },
          {
            title: '双击登录按钮防重（逆向）',
            shot: 'matrix/saas/guest-07-login-dblclick.png',
            steps: ['填入有效凭据后快速双击 Sign in'],
            verify: '仅一次登录跳转，不产生双 token/双跳转',
          },
          {
            title: '注册必填项逐个缺失（逆向）',
            steps: ['打开 /register', '分别只填两项留一项提交（username/email/password 三轮）'],
            verify: '每轮均被校验拦截并提示对应必填项，不产生半注册账号',
            shot: 'matrix/saas/guest/g-05-register.png',
          },
          {
            title: '注册密码短于 6 位被拒（逆向）',
            shot: 'matrix/saas/guest-08-short-password.png',
            steps: ['/register 填写合法用户名/邮箱，密码输入 abc1', '提交'],
            verify: 'min 6 校验拦截并提示，注册不成功',
          },
          {
            title: '注册含 emoji 用户名（正向实勘）',
            shot: 'matrix/saas/guest-09b-emoji-register-ok.png',
            steps: ['/register 用户名输入 🚀qa_emoji 类含 emoji 用户名提交'],
            verify: '实勘：注册成功或被校验拒绝均记录（参考 todo 站中文名可用先例），无 500',
          },
          {
            title: '访客直访租户子页批量拦截（逆向）',
            steps: ['未登录依次直接打开 /tenant/users、/tenant/todos、/tenant/settings'],
            verify: '三个路由均被 TenantGuard 拦回 /tenant/login，不泄露任何数据',
            shot: 'matrix/saas/guest/g-04-console-redirect.png',
          },
          {
            title: '伪造 token 调 /api/auth/me（逆向）',
            shot: 'matrix/saas/guest-10-fake-token-me-401.png',
            steps: ['curl -H "Authorization: Bearer fake-token123" 请求 GET /api/auth/me'],
            verify: '返回 401，不返回任何身份信息',
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
          {
            title: '空标题提交无效（逆向）',
            shot: 'matrix/todo/todo-user-01-empty-add-blocked.png',
            steps: ['打开 /todos', '不输入标题直接点击 Add Todo'],
            verify: '提交被拦截，Total 计数不变',
          },
          {
            title: 'WebSocket 未连接发消息（逆向）',
            shot: 'matrix/todo/todo-user-06-ws-send-disabled.png',
            steps: ['打开 /websocket', '不点 Connect 直接在输入框发送'],
            verify: '提示未连接或消息不发出，无假成功',
          },
          {
            title: '连续添加 3 条 todo（正向批量链）',
            steps: ['打开 /todos', '连续 3 次输入不同标题并点击 Add Todo'],
            verify: 'Total +3，三条按提交顺序置顶，输入框逐次清空',
            shot: 'journeys/todo-j2-add.png',
            selectors: {
              标题输入框: "[data-testid='todo-title-input']",
              添加按钮: "[data-testid='add-todo-button']",
            },
          },
          {
            title: '筛选切换组合（正向）',
            steps: ['/todos 依次点击 filter-pending → filter-completed → filter-all'],
            verify: '每个过滤下卡片状态与计数一致，切回 all 恢复全量',
            shot: 'matrix/todo/todo-02-filter-pending.png',
            selectors: {
              全部过滤: "[data-testid='filter-all']",
              待办过滤: "[data-testid='filter-pending']",
              完成过滤: "[data-testid='filter-completed']",
            },
          },
          {
            title: '刷新后 todo 状态保持（正向）',
            steps: ['将一条 todo 状态改为 completed', '按 F5 硬刷新'],
            verify: '刷新后该条仍为 completed（服务端持久），Total 不变',
            shot: 'journeys/todo-j3-done.png',
            selectors: { 状态下拉: 'div.p-5.rounded-xl.border select' },
          },
          {
            title: '登出重登后数据保持（正向链）',
            steps: ['点击 Sign Out 登出', '/login 重新登录 demo 账号', '回到 /todos'],
            verify: '重登后列表与服务端一致（增删改结果保留），不丢数据',
            shot: 'matrix/todo/todo-11-login-success.png',
            selectors: {
              登出按钮: 'button.text-xs.text-gray-400',
              登录提交: "[data-testid='login-submit']",
            },
          },
          {
            title: 'XSS 注入 todo 标题（逆向）',
            shot: 'matrix/todo/todo-user-02-xss-title-escaped.png',
            steps: ['标题输入 <script>alert(1)</script>，点击 Add Todo', '查看卡片渲染'],
            verify: '标题按纯文本渲染不执行（无弹窗），随后删除清理',
          },
          {
            title: '超长标题提交（逆向）',
            shot: 'matrix/todo/todo-user-03-long-title-blocked.png',
            steps: ['标题粘贴 256+ 字符长串', '点击 Add Todo'],
            verify: '实勘：接受则卡片正常换行不溢出且 Total +1；拒绝则提示校验——记录行为，无崩溃',
          },
          {
            title: '双击 Add Todo 防重（逆向）',
            shot: 'matrix/todo/todo-user-05-dblclick-result.png',
            steps: ['输入标题后快速双击 Add Todo'],
            verify: '仅创建 1 条（若重复记录为缺陷），随后清理',
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
          {
            title: '登出态访问受保护接口（逆向）',
            shot: 'matrix/todo/todo-guest-01-api-401.png',
            steps: ['清空 localStorage 后无 token 请求 /api/todos 写接口'],
            verify: '返回 401，REST 层要求认证（页面自动登录为 demo 特性，接口层不放松）',
          },
          {
            title: '硬刷新后自动登录态保持（正向）',
            steps: ['直接打开 /todos', '按 F5 硬刷新后再新增一条'],
            verify: '刷新后仍处于自动登录态（可增删改），新条目 Total +1 成功',
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
            shot: 'matrix/market/a01-admin-dashboard.png',
            steps: ['打开 /admin', '输入 superadmin / 123456', '点击登录'],
            verify: '进入管理后台',
          },
          {
            title: '插件审核（approve/reject）',
            shot: 'matrix/market/a02-plugins-review-blank.png',
            steps: ['进入插件管理页', '查看待审核列表', '点击 approve 或 reject'],
            verify: '插件状态变更',
          },
          {
            title: '插件上架/下架',
            shot: 'matrix/market/a02-plugins-list-blank.png',
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
          {
            title: '插件下架/上架管理（已补建·正向复验）',
            shot: 'matrix/market/market-admin-plugins-working.png',
            steps: [
              'superadmin 登录 /admin → 侧栏"插件管理"→ 插件列表',
              '对 approved 插件执行下架（填原因），rejected 执行上架',
            ],
            verify:
              '✅ 已补建（第九轮）：列表/审核队列/看板/分类四页 + 下架/上架/推荐/删除全操作；对不存在 slug 404 不产生副作用',
          },
          {
            title: '缺名称的插件表单被拒（逆向）',
            steps: ['发布/编辑表单不填名称直接提交'],
            verify: '校验拦截并提示必填',
            shot: 'matrix/market/market-admin-publish-empty-name-rejected.png',
          },
        ],
      },
      {
        name: '开发者',
        cred: '注册后登录（注意：登录页预填 developer@pluginhub.io 实际无效）',
        cases: [
          {
            title: '注册开发者账号',
            shot: 'matrix/market/d1-register-filled.png',
            steps: ['打开注册页', '填写用户名/邮箱/密码', '提交'],
            verify: '注册成功跳转登录',
          },
          {
            title: '提交插件',
            shot: 'matrix/market/d2-plugin-detail-pending.png',
            steps: ['登录后点击 Publish', '填写插件信息（名称/描述/版本/仓库）', '提交'],
            verify: '插件进入 pending 审核状态',
          },
          {
            title: '查看审核状态',
            shot: 'matrix/market/d3-developer-dashboard-pending.png',
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
            title: '个人中心（已修·显示登录身份）',
            steps: ['登录后访问 /profile', '访问"我的安装"/installed'],
            verify:
              '✅ 已修：profile 显示登录用户名（非 Jane Doe）；"我的安装"页已建（第六轮），列表/卸载/重装终验 PASS',
            shot: 'matrix/market/market-19-profile-janedoe-hardcoded.png',
          },
          {
            title: '我的安装页列表',
            steps: ['登录后导航点击"我的安装"（/installed）'],
            verify: '列出当前用户已安装插件（名称/版本/安装时间），无旧 mock 数据',
            shot: 'matrix/market/market-16b-logged-in-home.png',
          },
          {
            title: '卸载已安装插件',
            shot: 'matrix/market/U1-after-uninstall-empty-list.png',
            steps: ['在 /installed 点击卸载', '回详情页重新 Install'],
            verify: '卸载后列表移除、重装恢复，installed 状态服务端驱动',
          },
          {
            title: '未登录访问我的安装（逆向）',
            shot: 'matrix/market/U11-signedout-installed-guide-card.png',
            steps: ['登出后直接访问 /installed'],
            verify: '401 由 apiClient 统一跳转 /login，不泄露安装数据',
          },

          {
            title: '重复安装幂等（逆向）',
            shot: 'matrix/market/U2U3-reinstalled-single-entry-1542.png',
            steps: ['同一插件连续点击 Install 两次'],
            verify: '安装记录唯一（UNIQUE 约束幂等），计数仅累加、不产生重复安装行',
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
            shot: 'matrix/market/G1-search-empty-zzzqqq.png',
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
            shot: 'matrix/forum/a01-create-publish.png',
            steps: ['登录管理后台', '进入内容管理', '新建内容 → 填写 → 发布'],
            verify: '内容状态变为 published',
          },
          {
            title: '用户管理',
            shot: 'matrix/forum/a02-users.png',
            steps: ['进入用户管理页'],
            verify: '用户列表正常渲染',
          },
          {
            title: '系统设置',
            shot: 'matrix/forum/a03-system-settings.png',
            steps: ['进入系统设置页'],
            verify: '表单带出真实配置值',
          },
          {
            title: '空标题内容创建被拒（逆向）',
            shot: 'matrix/forum/a04-empty-title-rejected.png',
            steps: ['登录管理后台内容管理', '新建内容不填标题直接提交'],
            verify: '校验拦截并提示必填，不产生脏数据',
          },
          {
            title: '未登录访问管理 API（逆向）',
            shot: 'matrix/forum/a05-no-token-401.png',
            steps: ['不带 Authorization 请求管理端接口'],
            verify: '返回 401',
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
          {
            title: '发表评论',
            steps: ['登录态打开内容详情', '输入评论并发布'],
            verify: '评论出现在列表且计数 +1，F5 后持久',
            shot: 'matrix/forum/forum-13.png',
          },
          {
            title: '删除自己的评论',
            shot: 'matrix/forum/m01-2-after-delete.png',
            steps: ['在自己评论旁点击删除'],
            verify: '评论移除、计数 -1，他人评论不受影响',
          },
          {
            title: '删除他人评论被拒（逆向）',
            shot: 'matrix/forum/m02-others-comment-no-delete.png',
            steps: ['尝试删除他人评论（UI 无按钮；API 层 DELETE 他人评论）'],
            verify: 'UI 无入口；API 层 403，仅作者与 super_admin 可删',
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
            shot: 'matrix/forum/g01-guest-comment-login-required.png',
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
          {
            title: '游客态无评论管理按钮（逆向）',
            shot: 'matrix/forum/g02-no-manage-buttons.png',
            steps: ['登出后打开内容详情评论区'],
            verify: '可见评论列表但无任何删除按钮，显示"登录后参与讨论"引导',
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
            title: '加入购物车（已补建·正向复验）',
            steps: ['打开内容详情', '点击购买条"加入购物车"'],
            verify:
              '✅ 已补建（第四轮）：详情页购买条（价格+加购按钮）→ 按钮变绿"已加入购物车" → Cart 页出现真实条目',
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
          {
            title: '加购→下单→订单生成（正向闭环）',
            shot: 'matrix/shop/shop-27-checkout-loop-orders.png',
            steps: ['详情页加入购物车', 'Cart 页点击 Checkout', '导航切换到 Orders'],
            verify:
              '生成 ORD-2026-xxxxxx 新订单（Processing 状态），购物车清空，旧 ORD-2024 mock 全部下线',
          },
          {
            title: '订单状态筛选',
            shot: 'matrix/shop/shop-28-order-filter-processing.png',
            steps: ['Orders 页点击 Processing 筛选 chip'],
            verify: '新订单在 Processing 下可见，Delivered 筛选下隐藏并显示空态',
          },
          {
            title: '空购物车 Checkout 无效（逆向）',
            shot: 'matrix/shop/shop-30-empty-cart-no-checkout.png',
            steps: ['清空购物车后尝试 Checkout'],
            verify: '无 Checkout 入口或点击无效果，不产生空订单',
          },
          {
            title: '详情页返回列表（正向）',
            steps: ['打开 ISR 教程详情 /content/content-2', '点击"← 返回内容列表"'],
            verify: '回到内容中心，列表与筛选状态不丢',
            shot: 'matrix/shop/shop-04.png',
            selectors: { 返回链接: "find text '← 返回内容列表'" },
          },
          {
            title: '搜索 + 分类筛选组合（正向）',
            steps: ['点击"教程"分类 tab', '在搜索框输入 ISR 并搜索'],
            verify: '组合条件下仅命中 ISR 教程卡，无跨类结果',
            shot: 'matrix/shop/shop-13.png',
            selectors: { 搜索输入框: 'input.px-4', 搜索按钮: 'form > button' },
          },
          {
            title: '分类连续切换（正向）',
            steps: ['依次点击 文章 → 教程 → 全部 tab'],
            verify: '每次切换列表即时刷新且 tab 高亮正确，切回全部恢复 2 卡',
            shot: 'matrix/shop/shop-02.png',
          },
          {
            title: '刷新后购物车状态保持（正向）',
            steps: ['进入 Cart 记录行数与 Total', '按 F5 硬刷新'],
            verify: '刷新后仍 3 行 4 件、Total $188.96（mock 态持久），布局不乱',
            shot: 'matrix/shop/shop-15.png',
          },
          {
            title: '购物车 qty 步进器加减（正向深化）',
            steps: ['在 Cart 对任一行点击 qty +1', '观察小计与 Total', '再点击 qty -1 恢复'],
            verify: '数量/小计/Total 随步进正确增减后复原',
            shot: 'matrix/shop/shop-15.png',
          },
          {
            title: 'Products 导航同源验证（正向边界）',
            steps: ['点击导航 Products'],
            verify: '/products 渲染同一内容中心且 Products 高亮（与首页同源）',
            shot: 'matrix/shop/shop-07-products-nav.png',
            selectors: { 导航Products: "[data-testid='nav-products-button']" },
          },
          {
            title: '订单状态筛选切换（正向）',
            steps: ['Orders 页依次点击 Shipped → Delivered → All 筛选 chip'],
            verify: '每个筛选下订单集合正确（5 张 mock 单分布合理），All 恢复全量',
            shot: 'matrix/shop/shop-17.png',
          },
          {
            title: '订单 Reorder 按钮探测（正向实勘）',
            steps: ['在 Delivered 订单上点击 Reorder'],
            verify: '实勘：记录跳转/反馈行为（不 500 不白屏），作为基线记录',
            shot: 'matrix/shop/shop-17.png',
          },
          {
            title: '移动端搜索结果页（正向边界）',
            shot: 'matrix/shop/shop-37-mobile-search-isr.png',
            steps: ['切 375x667 视口，搜索 ISR'],
            verify: '结果单卡纵向堆叠正常无横向溢出',
          },
          {
            title: '购物车 qty=-1（逆向）',
            steps: ['在 Cart 将某行 qty 连续点 - 至最小值', '尝试注入 -1（若输入框可编辑）'],
            verify: '数量不为负（min 1 或步进禁用），Total 永不为负',
            shot: 'matrix/shop/shop-15.png',
          },
          {
            title: '购物车 qty=9999 超大数量（逆向）',
            shot: 'matrix/shop/shop-33-qty9999-cart.png',
            steps: ['将某行 qty 调至 9999（步进连点或输入）'],
            verify: '实勘：接受则 Total 大数正常显示不溢出；有上限则被钳制——记录行为',
          },
          {
            title: '搜索框 XSS 注入（逆向）',
            steps: ['搜索框输入 <script>alert(1)</script> 并搜索'],
            verify: '关键词按文本处理不执行（无弹窗），呈现空结果态',
            shot: 'matrix/shop/shop-20.png',
            selectors: { 搜索输入框: 'input.px-4', 搜索按钮: 'form > button' },
          },
          {
            title: '搜索纯空格关键词（逆向）',
            shot: 'matrix/shop/shop-34-search-spaces-empty.png',
            steps: ['搜索框输入多个空格并提交'],
            verify: '不触发假搜索或显示空态，列表不闪空，无报错',
          },
          {
            title: '搜索超长关键词（逆向）',
            shot: 'matrix/shop/shop-35-search-long-error.png',
            steps: ['粘贴 256+ 字符长串搜索'],
            verify: '输入框/结果区不撑破布局，空态正常',
          },
          {
            title: '详情 URL 不存在 id（逆向·IDOR 面）',
            steps: ['直接访问 /content/content-999'],
            verify: '空态/404 文案渲染，HTTP 状态记录（soft-404 已知），不暴露他人资源',
            shot: 'matrix/shop/shop-18.png',
          },
          {
            title: 'Account 死链导航（逆向·已知缺陷）',
            steps: ['点击导航 Account'],
            verify: '⚠ 已知缺陷：Account 为死链，渲染 404 - Page not found',
            shot: 'matrix/shop/shop-08-account-404.png',
            selectors: { 导航Account: "[data-testid='nav-account-button']" },
          },
          {
            title: '双击 Checkout 重复下单（逆向）',
            shot: 'matrix/shop/shop-31-dblclick-checkout-orders.png',
            steps: ['在 Cart 快速双击 Checkout'],
            verify: '实勘：仅生成 1 笔订单（若重复记录为缺陷），购物车状态一致',
          },
          {
            title: 'Checkout 后空购物车刷新保持（正向闭环深化）',
            shot: 'matrix/shop/shop-32-postcheckout-refresh-empty.png',
            steps: ['完成 Checkout 进入 Cart', '按 F5 硬刷新'],
            verify: '实勘：清空态保持不回填 mock 商品（若回填记录为缺陷）',
          },
          {
            title: '伪造 token 调订单写接口（逆向·API 级）',
            shot: 'matrix/shop/shop-38-api-fake-token.txt',
            steps: [
              'curl -X POST -H "Authorization: Bearer fake-token123" https://shop.lpm1.top/api/orders',
            ],
            verify: '实勘：此形态无鉴权模块（公开站为预期）——记录写接口是否开放，若开放记录为风险',
          },
          {
            title: '分类 tab 快速连点（逆向·竞态）',
            shot: 'matrix/shop/shop-36-tab-rapid-click-all.png',
            steps: ['快速连续点击多个分类 tab（文章/教程/公告连点）'],
            verify: '最终停在最后点击的分类，列表与高亮一致，无竞态错乱',
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
          {
            title: '空标题提交无效（逆向）',
            shot: 'matrix/minimal/minimal-11-empty-title-disabled.png',
            steps: ['不输入任何内容直接点击 Add'],
            verify: '按钮禁用或提交无效果，不产生空标题条目',
          },
          {
            title: '状态切换后改回 pending（正向链）',
            steps: ['下拉选择 completed', '再改回 pending'],
            verify: '先变绿+划线，改回后恢复普通样式，无残留样式',
            shot: 'matrix/minimal/minimal-08-completed.png',
            selectors: { 状态下拉: 'div.p-5.rounded-xl.border select' },
          },
          {
            title: '刷新后列表与状态保持（正向）',
            steps: ['记录当前列表与某条状态', '按 F5 硬刷新'],
            verify: '刷新后列表条目与状态和刷新前一致，Total 计数不变',
            shot: 'matrix/minimal/01-home.png',
          },
          {
            title: '连续添加 3 条（正向批量链）',
            steps: ['连续 3 次输入不同标题并点击 Add'],
            verify: 'Total +3，三条按序置顶，测试后逐条删除清理（与 todo 站共享后端）',
            shot: 'matrix/minimal/02-add-new.png',
            selectors: {
              输入框: "[data-testid='todo-title-input']",
              添加按钮: "[data-testid='add-todo-button']",
            },
          },
          {
            title: 'emoji/中英混合标题正常提交（正向）',
            shot: 'matrix/minimal/minimal-13-emoji-mixed-title.png',
            steps: ['输入 🚀 上线 Release Notes 中英混合 标题', '点击 Add', '确认后删除清理'],
            verify: '条目正常显示无乱码无报错，清理后恢复基线',
          },
          {
            title: '纯空格标题提交（逆向）',
            shot: 'matrix/minimal/minimal-12-spaces-title-disabled.png',
            steps: ['输入框只输入多个空格', '观察 Add 按钮状态并尝试提交'],
            verify: 'Add 保持 disabled 或提交无效果（trim 守卫），不产生空标题条目',
          },
          {
            title: '超长标题提交（逆向）',
            shot: 'matrix/minimal/minimal-14-long-title-200-cap.png',
            steps: ['粘贴 256+ 字符长串标题', '点击 Add'],
            verify: '实勘：接受则卡片换行不撑破布局且 Total +1；拒绝则校验提示——记录行为',
          },
          {
            title: 'XSS 注入标题转义验证（逆向）',
            shot: 'matrix/minimal/minimal-15-xss-escaped.png',
            steps: ['标题输入 <script>alert(1)</script>，点击 Add', '查看卡片渲染'],
            verify: '纯文本渲染不执行（无弹窗），随后删除清理',
          },
          {
            title: '双击 Add 防重（逆向）',
            shot: 'matrix/minimal/minimal-16-dblclick-single-entry.png',
            steps: ['输入标题后快速双击 Add 按钮'],
            verify: '仅新增 1 条（若重复记录为缺陷），随后清理',
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
            shot: 'matrix/cli-only/cli-01-commands.txt',
            steps: ['npm run cli -- --help', '运行 todos list 等命令'],
            verify: '命令输出正常',
          },
          {
            title: 'API 调用',
            shot: 'matrix/cli-only/cli-02-api-call.txt',
            steps: ['curl http://localhost:3010/api/todos'],
            verify: 'API 返回 JSON 数据',
          },
          {
            title: '未知命令报错（逆向）',
            shot: 'matrix/cli-only/cli-03-unknown-command.txt',
            steps: ['npm run cli -- not-a-real-command'],
            verify: '输出未知命令错误与用法提示，非静默成功',
          },
          {
            title: '访问不存在 API（逆向）',
            shot: 'matrix/cli-only/cli-04-api-not-exist.txt',
            steps: ['curl http://localhost:3010/api/not-exist'],
            verify: '返回 404，不泄露堆栈',
          },
          {
            title: 'todos add→list→delete CLI 闭环（正向链）',
            shot: 'matrix/cli-only/cli-05-loop.txt',
            steps: [
              'npm run cli -- todos add "qa-e2e-chain-item"',
              'npm run cli -- todos list',
              'npm run cli -- todos delete <id>',
            ],
            verify: 'list 输出包含新条目，删除后再 list 不再出现',
          },
          {
            title: 'CLI help 探测（正向）',
            shot: 'matrix/cli-only/cli-06-help-probe.txt',
            steps: ['npm run cli -- --help', 'npm run cli -- todos --help'],
            verify: '两级用法输出完整（命令列表与子命令说明），退出码 0',
          },
          {
            title: '伪造 Bearer token 调写接口（逆向）',
            shot: 'matrix/cli-only/cli-07-fake-token.txt',
            steps: [
              'curl -X POST -H "Authorization: Bearer fake-token123" http://localhost:3010/api/todos',
            ],
            verify: '返回 401，不产生任何待办数据',
          },
          {
            title: 'API 非法 payload 批量探测（逆向）',
            shot: 'matrix/cli-only/cli-08-payloads.txt',
            steps: [
              'POST /api/todos 依次提交三种 payload：空标题 {"title":""}、超长 256+ 字符标题、<script>alert(1)</script> 注入标题',
            ],
            verify: '每个 payload 均被 400/422 拒绝（或记录转义存储行为），绝不 500 不崩溃',
          },
        ],
      },
    ],
  },
]

function main() {
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true })

  const NEG_KEYWORDS = [
    '逆向',
    '被拒',
    '403',
    '401',
    '404',
    '无权限',
    '越权',
    '错误',
    '异常',
    '失败',
    '不存在',
    '无效',
    '未登录',
    '游客',
    '拒绝',
    '静默',
    '假',
    '死路',
    '缺失',
    '泄漏',
    'Invalid',
    'denied',
    'permission',
    '未配置',
    '兜底',
    '占位',
    '硬编码',
    '写死',
    '恒高亮',
    '错乱',
    '矛盾',
    '限流',
    '幂等',
    '校验拦截',
    '不放',
    '下架入口',
    'IDOR',
    '注入',
    '伪造',
    '超长',
    '空格',
    '重复提交',
    '越界',
  ]
  const PORTAL_META: Record<string, { zh: string; portalId: string }> = {
    'fullstack-admin': { zh: '全模块管理后台', portalId: 'fullstack' },
    saas: { zh: '多租户 SaaS', portalId: 'saas' },
    'todo-app': { zh: '经典全栈', portalId: 'todo' },
    'xbrowser-marketplace': { zh: '插件市场', portalId: 'market' },
    ecommerce: { zh: '电商交易', portalId: 'shop' },
    forum: { zh: '社区论坛', portalId: 'forum' },
    minimal: { zh: '极简骨架', portalId: 'minimal' },
    'cli-only': { zh: 'CLI 工具', portalId: 'cli' },
  }
  const playbookData: Array<Record<string, unknown>> = []

  for (const preset of PRESETS) {
    const sel = parseSelectors(join(KB, preset.kbModule, 'selectors.yml'))
    let md = `# ${preset.name} — Test Playbook\n\n`
    md += `> 站点：${preset.site}\n> 身份数：${preset.identities.length}\n`
    md += `> 每个身份列出：操作步骤 → 验证 → 截图 → 选择器\n\n---\n\n`

    for (const identity of preset.identities) {
      // 合并扩充案例链（scripts/playbook-chains-forum-market.ts）：生成正文与计数使用同一合并列表
      const extra = EXTRA_CHAINS[`${preset.id}:${identity.name}`] ?? []
      const allCases = [...identity.cases, ...extra]
      const negCount = allCases.filter(c =>
        NEG_KEYWORDS.some(k => c.title.toLowerCase().includes(k.toLowerCase()))
      ).length
      md += `## ${identity.name}\n\n`
      md += `**凭据**: \`${identity.cred}\`\n\n`
      md += `**案例数**: ${allCases.length}\n\n`

      for (const c of allCases) {
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

      playbookData.push({
        portalId: PORTAL_META[preset.id]?.portalId ?? preset.id,
        zh: PORTAL_META[preset.id]?.zh ?? preset.name,
        name: preset.name,
        site: preset.site,
        identity: identity.name,
        pos: allCases.length - negCount,
        neg: negCount,
        cases: allCases.map(c => ({
          t: c.title,
          s: c.steps,
          v: c.verify,
          shot: c.shot ?? null,
          neg: NEG_KEYWORDS.some(k => c.title.toLowerCase().includes(k.toLowerCase())),
        })),
      })
    }

    // 附：该模块全部已知选择器
    if (Object.keys(sel).length > 0) {
      md += `## 附：全部已知选择器（来自知识库）\n\n| 键 | 值 |\n|---|---|\n`
      for (const [k, v] of Object.entries(sel)) {
        md += `| ${k} | ${v.replace(/\|/g, '\\|')} |\n`
      }
    }

    writeFileSync(join(OUT, `${preset.id}.md`), md)
    const total = preset.identities.reduce(
      (s, i) => s + i.cases.length + (EXTRA_CHAINS[`${preset.id}:${i.name}`]?.length ?? 0),
      0
    )
    console.log(`✓ playbooks/${preset.id}.md（${preset.identities.length} 身份, ${total} 案例）`)
  }

  const pbTotal = playbookData.reduce((a, p) => a + p.cases.length, 0)
  // safe-embed：数据含 <script>alert(1)</script> 类注入测试串，
  // </ 转义为 <\/ 防止内联 <script> 标签被提前截断（JSON 语义不变）
  const safe = JSON.stringify(playbookData).replace(/<\//g, '<\\/')
  writeFileSync(
    join(ROOT, 'portal', 'playbook-data.js'),
    '// 自动生成：npx tsx scripts/generate-test-playbooks.ts\nexport const PLAYBOOKS=' + safe + '\n'
  )
  console.log(`✓ portal/playbook-data.js（${playbookData.length} preset, ${pbTotal} 链路）`)
}

main()

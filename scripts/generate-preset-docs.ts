/**
 * Preset 文档生成器 v3：为每个 preset 自动产出介绍文档（docs/PRESETS/<id>.md）。
 * 新增：身份×权限矩阵（管理员/用户/客服/游客等全角色覆盖）、API 去重。
 * 数据源：template/modules.config.ts + template/src/server/modules/<名称>/module.ts。
 * 重新生成：npx tsx scripts/generate-preset-docs.ts
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs'
import { join } from 'path'

const ROOT = join(import.meta.dirname ?? process.cwd(), '..')
const CFG = join(ROOT, 'template', 'modules.config.ts')
const OUT = join(ROOT, 'docs', 'PRESETS')
const MODULES_DIR = join(ROOT, 'template', 'src', 'server')

interface Role {
  name: string
  desc: string
  canDo: string[]
  cannotDo: string[]
  credentials?: string
}

/** 各 preset 的元信息与完整身份清单 */
const META: Record<
  string,
  {
    title: string
    positioning: string
    fit: string
    notfit: string
    subdomain: string
    extraVerify: string[]
    roles: Role[]
  }
> = {
  'fullstack-admin': {
    title: 'Fullstack Admin — 全模块管理后台',
    positioning: '全部 15 个模块的最全形态：管理后台 + 多租户 + 插件市场 + 电商 + 内容，一套全有。',
    fit: '快速搭全能型后台原型；学习 Hono RPC/Zod 端到端类型安全与多入口管理台架构。',
    notfit: '生产直接使用（演示站协议与默认凭据需先处理）。',
    subdomain: 'fullstack',
    extraVerify: ['GET /api/plugins/search?q=a → 200', 'POST /api/auth/login → 200'],
    roles: [
      {
        name: '超级管理员 (super_admin)',
        desc: '拥有全部 45 项权限，可管理所有模块、用户、角色、系统设置',
        canDo: [
          '仪表盘统计（总待办/待处理/已完成）',
          '用户管理（查看/创建/编辑/删除）',
          '内容管理（新建/编辑/发布/删除）',
          '订单/工单/纠纷管理',
          '角色与权限管理',
          '系统设置读写',
          '插件管理与审核',
          '审计日志查看',
          '租户管理（/tenant 独立入口）',
        ],
        cannotDo: ['—（拥有全部权限）'],
        credentials: 'superadmin / 123456（或快速登录按钮）',
      },
      {
        name: '客服人员 (customer_service)',
        desc: '可查看内容、处理工单，不能管理系统或用户',
        canDo: ['查看内容列表（只读）', '查看工单管理页', '通知中心', '自己的 todos'],
        cannotDo: [
          '仪表盘统计（API 403 → 卡片显示 0）',
          '用户管理（API 403 → 空表）',
          '系统设置（API 403 → 空表单）',
          '内容新建/编辑（按钮不渲染）',
          '角色管理（API 403）',
        ],
        credentials: 'customerservice / 123456（快速登录按钮）',
      },
      {
        name: '普通用户 (user)',
        desc: '基础权限：查看内容、管理自己的 todos',
        canDo: ['查看内容列表', '自己的 todos CRUD', '通知中心', '媒体/验证码测试页'],
        cannotDo: [
          '仪表盘统计',
          '用户管理',
          '系统设置',
          '内容新建/编辑',
          '角色管理',
          '订单/工单/纠纷',
        ],
        credentials: 'user1 / 123456（快速登录按钮）',
      },
      {
        name: '游客（未登录）',
        desc: '无需登录即可浏览公开页面',
        canDo: [
          '浏览 /todos 页（SSR 渲染数据）',
          '浏览 /notifications（SSE Demo）',
          '浏览 /websocket（WS Demo）',
        ],
        cannotDo: ['写操作需认证（API 返回 401）', '访问 /admin 管理后台'],
        credentials: '无需登录',
      },
      {
        name: '开发者 (developer)',
        desc: '通过 auth 模块注册，可管理 API key',
        canDo: ['注册开发者账号', '获取 API key', 'API 调用'],
        cannotDo: ['管理后台（需 admin 角色）', '管理租户'],
        credentials: '通过 /api/auth/register 注册',
      },
      {
        name: '商家 (merchant)',
        desc: '商家端独立登录，管理自己的商品和订单',
        canDo: ['商家端登录', '管理自己的商品', '查看自己的订单/统计'],
        cannotDo: ['管理后台', '管理其他商家'],
        credentials: 'merchant 模块种子账号（Demo@2024!）',
      },
      {
        name: '租户管理员 (tenant_admin)',
        desc: '通过 /tenant 独立入口管理本租户',
        canDo: ['租户控制台管理成员/角色', '租户设置', '租户内 todos'],
        cannotDo: ['平台级管理（需 super_admin）'],
        credentials: 'superadmin / admin123（/tenant/login）',
      },
    ],
  },
  'todo-app': {
    title: 'Todo App — 经典全栈起步形态',
    positioning: 'todos + chat + notifications + auth 的经典四模块组合。',
    fit: '学习脚手架主干（RPC/测试/部署）；以此为底座开发自己的业务模块。',
    notfit: '需要管理后台/多租户/内容管理的场景。',
    subdomain: 'todo',
    extraVerify: ['GET /api/todos → 200 种子数据'],
    roles: [
      {
        name: '注册用户',
        desc: '注册后可管理自己的 todos、使用聊天和通知',
        canDo: ['注册新账号', '登录后 todos CRUD', 'WebSocket 聊天', 'SSE 通知'],
        cannotDo: ['管理后台（此形态无 /admin）', '多租户功能'],
        credentials: 'demo@biomimic.app（登录页预填演示凭据）',
      },
      {
        name: '游客（未登录）',
        desc: '自动以 Demo User 身份登录（dev token），可直接操作',
        canDo: [
          '浏览 todos 列表',
          '新增/修改/删除 todos（dev token 自动登录）',
          'SSE/WebSocket 页面',
        ],
        cannotDo: ['—（dev 模式下自动登录）'],
        credentials: '无需登录（自动登录为 Demo User）',
      },
    ],
  },
  saas: {
    title: 'SaaS Multi-Tenant — 多租户 SaaS',
    positioning: '多租户 SaaS 全链路：租户开通事务、成员邀请、租户内角色、套餐配额、子域隔离。',
    fit: 'B2B 工具站/多组织内容平台/内部多部门系统。',
    notfit: 'C 端个人用户；需要真订阅计费（Stripe 未集成）。',
    subdomain: 'saas',
    extraVerify: ['POST /api/auth/login → 200 JWT', 'GET /api/tenants/mine → 200'],
    roles: [
      {
        name: '平台超管 (super_admin)',
        desc: '管理所有租户、开通/暂停、设置套餐配额',
        canDo: ['租户 CRUD', '设置套餐（plan/max_users）', '查看所有租户的成员和角色', 'CLI 管理'],
        cannotDo: ['—（平台级最高权限）'],
        credentials: 'superadmin / admin123',
      },
      {
        name: '租户管理员 (tenant_admin)',
        desc: '管理本租户的成员、角色、设置',
        canDo: [
          '查看仪表盘统计',
          '成员列表/邀请/改角色/移除',
          '租户设置（改名等）',
          '查看订阅/配额',
          '本租户的 todos CRUD',
        ],
        cannotDo: ['创建/删除租户（需平台超管）', '修改套餐 plan（需平台超管）'],
        credentials: 'superadmin / admin123（/tenant/login）',
      },
      {
        name: '租户成员 (tenant_member)',
        desc: '受邀请加入租户的普通成员',
        canDo: ['查看仪表盘（按用户隔离）', '自己的 todos CRUD', '查看内容'],
        cannotDo: ['邀请成员（API 403）', '移除成员（API 403）', '修改租户设置', '管理租户角色'],
        credentials: '受邀注册后登录',
      },
      {
        name: '访客（未登录）',
        desc: '未认证用户',
        canDo: ['查看邀请落地页（脱敏详情）', '注册新账号'],
        cannotDo: ['访问租户控制台（拦回登录页）', '伪造邀请 token（显示 Invitation not found）'],
        credentials: '无需登录',
      },
      {
        name: '开发者 (developer)',
        desc: '通过 auth 模块注册，可管理 API key',
        canDo: ['注册开发者账号', '获取 API key'],
        cannotDo: ['管理租户', '管理后台'],
        credentials: '通过 /api/auth/register 注册',
      },
    ],
  },
  ecommerce: {
    title: 'Ecommerce — 电商交易形态',
    positioning: '订单/购物车/工单/纠纷仲裁/内容的电商组合。',
    fit: '交易类应用原型；需要工单与仲裁流程的业务。',
    notfit: '真实支付（订单为演示数据）。',
    subdomain: 'shop',
    extraVerify: ['GET /api/orders-mock → 200', 'GET /api/todos → 200'],
    roles: [
      {
        name: '游客/消费者',
        desc: '此形态无 auth 模块，线上唯一身份就是游客（浏览+操作演示数据）',
        canDo: [
          '浏览内容中心',
          '分类筛选/搜索',
          '查看内容详情',
          '购物车页面（mock）',
          '查看订单（mock）',
          'todos CRUD',
        ],
        cannotDo: ['真实下单/支付', '管理后台（此形态无 /admin）', '登录/注册（无 auth 模块）'],
        credentials: '无需登录（此形态无认证模块，仅有游客身份）',
      },
    ],
  },
  forum: {
    title: 'Forum — 社区论坛形态',
    positioning: '内容 + 权限 + 管理后台 + 通知的社区组合。',
    fit: '社区/论坛/博客平台原型；内容审核流场景。',
    notfit: '需要用户动态/实时聊天。',
    subdomain: 'forum',
    extraVerify: ['GET /api/public/contents → 200', 'GET /api/topics → 200'],
    roles: [
      {
        name: '管理员 (super_admin)',
        desc: '内容发布/审核/删除、用户管理、系统设置',
        canDo: ['内容新建/编辑/发布/删除', '用户管理', '系统设置', '审计日志'],
        cannotDo: ['—（全权限）'],
        credentials: 'superadmin / 123456',
      },
      {
        name: '注册用户',
        desc: '注册后可发帖/评论',
        canDo: ['注册/登录', '浏览全部内容', '查看内容详情'],
        cannotDo: ['管理后台', '删除他人内容'],
        credentials: 'member@community.dev（预填）',
      },
      {
        name: '游客（未登录）',
        desc: '浏览公开内容',
        canDo: ['浏览内容列表', '分类筛选/搜索', '查看内容详情'],
        cannotDo: ['发帖/评论', '管理后台'],
        credentials: '无需登录',
      },
    ],
  },
  'xbrowser-marketplace': {
    title: 'XBrowser Marketplace — 插件市场',
    positioning: '插件上架/审核/安装/评价全生命周期 + 订单工单纠纷。',
    fit: '浏览器插件/应用市场类平台；需要审核流的 UGC 平台。',
    notfit: '轻量工具站。',
    subdomain: 'market',
    extraVerify: ['GET /api/plugins/search?q=a → 200'],
    roles: [
      {
        name: '平台管理员 (super_admin)',
        desc: '插件审核/上架/下架、商家管理、订单纠纷处理',
        canDo: [
          '插件审核（approve/reject）',
          '插件上架/下架',
          '商家管理',
          '订单/工单/纠纷',
          '系统设置',
        ],
        cannotDo: ['—（全权限）'],
        credentials: 'superadmin / 123456',
      },
      {
        name: '开发者 (developer)',
        desc: '注册后可提交插件、管理自己的插件版本',
        canDo: ['注册开发者账号', '提交插件', '管理自己的插件版本', '查看审核状态'],
        cannotDo: ['审核他人插件', '管理后台', '订单管理'],
        credentials: '注册后登录',
      },
      {
        name: '用户/浏览器用户',
        desc: '浏览/搜索/安装/评价插件',
        canDo: ['浏览插件市场', '搜索插件', '查看插件详情', '安装插件', '写评论'],
        cannotDo: ['提交插件（需开发者身份）', '审核插件', '管理后台'],
        credentials: '无需登录（浏览）/ 注册后（评论）',
      },
      {
        name: '游客（未登录）',
        desc: '仅浏览插件市场',
        canDo: ['浏览插件列表', '搜索', '查看插件详情'],
        cannotDo: ['安装/评论（需登录）', '提交插件', '管理后台'],
        credentials: '无需登录',
      },
    ],
  },
  minimal: {
    title: 'Minimal — 极简单模块',
    positioning: '只有 todos 一个业务模块的极简形态。',
    fit: '验证部署链路；作为从零学习模板结构的起点。',
    notfit: '任何真实业务。',
    subdomain: 'minimal',
    extraVerify: ['GET /api/todos → 200'],
    roles: [
      {
        name: '游客（未登录）',
        desc: '可直接操作 todos（无认证模块）',
        canDo: ['浏览 todos 列表', '新增/修改/删除 todos'],
        cannotDo: ['—（此形态无认证/权限模块）'],
        credentials: '无需登录',
      },
    ],
  },
  'cli-only': {
    title: 'CLI Only — 纯命令行形态',
    positioning: '无前端 UI，纯 CLI + API 服务。',
    fit: '后端 API 原型；CLI 工具开发。',
    notfit: '需要 Web 界面的场景。',
    subdomain: '',
    extraVerify: [],
    roles: [
      {
        name: 'CLI 用户',
        desc: '通过命令行与 API 交互',
        canDo: ['CLI 命令（todos/notifications/auth 等）', 'API 调用'],
        cannotDo: ['Web UI（此形态无前端）'],
        credentials: '通过 CLI 登录',
      },
    ],
  },
}

/** 从 modules.config.ts 提取 preset 定义 */
function parsePresets(): Array<{ id: string; description: string; modules: string[] }> {
  const s = readFileSync(CFG, 'utf-8')
  const out: Array<{ id: string; description: string; modules: string[] }> = []
  const re = /id: '([^']+)',[\s\S]*?description:\s*'([^']+)'[\s\S]*?modules: \[([^\]]+)\]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(s))) {
    const modules = m[3]
      .replace(/\/\/[^\n]*/g, '')
      .split(',')
      .map(x => x.trim().replace(/'/g, ''))
      .filter(Boolean)
    out.push({ id: m[1], description: m[2], modules })
  }
  return out
}

/** 从 manifest 文件提取路由路径（去重） */
function extractRoutes(moduleName: string): string[] {
  const dir = join(MODULES_DIR, `module-${moduleName}`)
  if (!existsSync(dir)) return []
  const routesDir = join(dir, 'routes')
  if (!existsSync(routesDir)) return []
  const files = readdirSync(routesDir).filter(f => f.endsWith('.ts'))

  // 收集所有路由（RESTful + OpenAPI），统一去重
  const seen = new Set<string>()
  const routes: string[] = []

  for (const f of files) {
    const s = readFileSync(join(routesDir, f), 'utf-8')
    // RESTful 风格——过滤 getter 调用（如 c.get('authUser')，非 HTTP 路径）
    for (const rm of s.matchAll(/\.(get|post|put|delete|patch)\('([^']+)'/g)) {
      if (!rm[2].startsWith('/')) continue // 排除非路径（authUser/tenant 等上下文读取）
      const key = `${rm[1].toUpperCase()} ${rm[2]}`
      if (!seen.has(key)) {
        seen.add(key)
        routes.push(key)
      }
    }
    // OpenAPI 风格（createRoute path）——与方法无关，只取路径去重
    for (const pm of s.matchAll(/path: '([^']+)'/g)) {
      const key = `OPENAPI ${pm[1]}`
      if (!seen.has(key)) {
        seen.add(key)
        routes.push(key)
      }
    }
  }
  return routes
}

function main() {
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true })
  const presets = parsePresets()
  let index =
    '# Preset 目录\n\n| 形态 | 在线 Demo | 文档 | 定位 | 身份数 |\n|---|---|---|---|---|\n'

  for (const p of presets) {
    const meta = META[p.id] ?? {
      title: p.id,
      positioning: p.description,
      fit: '—',
      notfit: '—',
      subdomain: p.id,
      extraVerify: [],
      roles: [],
    }
    const demoUrl = p.id === 'cli-only' ? null : `https://${meta.subdomain}.lpm1.top`
    const roles = meta.roles ?? []

    // 模块职责
    const moduleLines: string[] = []
    for (const mod of p.modules) {
      const mfPath = join(MODULES_DIR, `module-${mod}`, 'module.ts')
      let desc = '—'
      if (existsSync(mfPath)) {
        const s = readFileSync(mfPath, 'utf-8')
        const dm = s.match(/description:\s*'([^']+)'/)
        if (dm) desc = dm[1]
      }
      moduleLines.push(`| \`${mod}\` | ${desc} |`)
    }

    // API 面（去重后）
    const apiLines: string[] = []
    for (const mod of p.modules) {
      const routes = extractRoutes(mod)
      if (routes.length > 0) {
        apiLines.push(`\n**${mod}**（${routes.length} 条）：\n`)
        for (const r of routes.slice(0, 30)) apiLines.push(`- \`${r}\``)
      }
    }

    // 截图区
    const rawBase =
      'https://raw.githubusercontent.com/dyyz1993/fullstack-scaffold/master/docs/PRESETS/screenshots'
    const shotMap: Record<string, string[]> = {
      'fullstack-admin': ['fullstack-login', 'fullstack-dashboard', 'fullstack-users'],
      'todo-app': ['todo-home'],
      saas: ['saas-home', 'saas-tenant-login', 'saas-tenant-dashboard'],
      ecommerce: ['shop-home'],
      forum: ['forum-home'],
      'xbrowser-marketplace': ['market-home', 'market-detail'],
      minimal: ['minimal-home'],
    }
    const shots = shotMap[p.id] ?? []
    const shotSection =
      shots.length > 0
        ? `## 界面速览\n\n${shots.map(n => `![${n}](${rawBase}/${n}.png)`).join('\n\n')}\n`
        : ''

    // 身份×权限矩阵
    const roleSection =
      roles.length > 0
        ? `## 用户角色与权限（${roles.length} 种身份）\n\n` +
          roles
            .map(r => {
              const canList = r.canDo.map(c => `  - ✓ ${c}`).join('\n')
              const cannotList = r.cannotDo.map(c => `  - ✗ ${c}`).join('\n')
              const cred = r.credentials ? `\n  **凭据**: \`${r.credentials}\`` : ''
              return `### ${r.name}\n\n${r.desc}${cred}\n\n**能做**:\n${canList}\n\n**不能做**:\n${cannotList}\n`
            })
            .join('\n')
        : '（身份信息待补充）\n'

    const doc = `# ${meta.title}

> ${meta.positioning}

- **在线演示**：${demoUrl ?? '无（纯 CLI 形态）'}
- **模块数**：${p.modules.length}
- **身份数**：${roles.length}
- **文档**: [GitHub](${`https://github.com/dyyz1993/fullstack-scaffold/blob/master/docs/PRESETS/${p.id}.md`})

${shotSection}## 适用 / 不适用

- **适用**：${meta.fit}
- **不适用**：${meta.notfit}

${roleSection}
## 模块清单

| 模块 | 职责 |
|---|---|
${moduleLines.join('\n')}

## API 面

${apiLines.length > 0 ? apiLines.join('\n') : '（CLI-only 形态无 HTTP API）'}

## 验证清单

${demoUrl ? `- \`curl ${demoUrl}/health\` → 200` : '- CLI 可用'}
${meta.extraVerify.map(v => `- ${v}`).join('\n')}

> 由 \`scripts/generate-preset-docs.ts\` 生成。
`
    writeFileSync(join(OUT, `${p.id}.md`), doc)
    index += `| ${meta.title.split('—')[0].trim()} | ${demoUrl ?? '本地'} | [文档](./${p.id}.md) | ${meta.positioning.slice(0, 40)}… | ${roles.length} |\n`
    console.log(`✓ ${p.id}.md（${roles.length} 身份, API 去重后）`)
  }

  writeFileSync(join(OUT, 'INDEX.md'), index)
  console.log(`✓ INDEX.md`)
}

main()

/**
 * Preset 文档生成器：为每个 preset 自动产出介绍文档（docs/PRESETS/<id>.md）。
 * 数据源：template/modules.config.ts（preset 定义）+ template/src/server/modules/<名称>/module.ts（manifest）。
 * 文档含：定位、模块清单×职责、按模块分组的 API 面、演示入口、验证清单。
 * 重新生成：npx tsx scripts/generate-preset-docs.ts
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs'
import { join } from 'path'

const ROOT = join(import.meta.dirname ?? process.cwd(), '..')
const CFG = join(ROOT, 'template', 'modules.config.ts')
const OUT = join(ROOT, 'docs', 'PRESETS')
const MODULES_DIR = join(ROOT, 'template', 'src', 'server')

/** 各 preset 的手写元信息（定位/适用场景/演示子域/登录凭据）——写死在此，代码只生成结构化部分 */
const META: Record<
  string,
  {
    title: string
    positioning: string
    fit: string
    notfit: string
    subdomain: string
    extraVerify: string[]
  }
> = {
  'fullstack-admin': {
    title: 'Fullstack Admin — 全模块管理后台',
    positioning:
      '全部 13 个模块的最全形态：管理后台 + 多租户 + 插件市场 + 电商 + 内容，一 applic全有。',
    fit: '快速搭全能型后台原型；学习 Hono RPC/Zod 端到端类型安全与多入口管理台架构；AI Agent 自动开发场景。',
    notfit: '生产直接使用（演示站协议与默认凭据需先处理）；只要单一功能的轻量场景。',
    subdomain: 'fullstack',
    extraVerify: [
      'GET /api/plugins/search?q=a → 200 插件市场数据',
      'POST /api/auth/login (username=superadmin, password=123456) → 200（admin mock 登录）',
    ],
  },
  'todo-app': {
    title: 'Todo App — 经典全栈起步形态',
    positioning:
      'todos + chat + notifications + auth 的经典四模块组合，最贴近“标准全栈应用”的心智模型。',
    fit: '学习脚手架主干（RPC/测试/部署）；以此为底座开发自己的业务模块。',
    notfit: '需要管理后台/多租户/内容管理的场景（改用 fullstack-admin 或 saas）。',
    subdomain: 'todo',
    extraVerify: ['GET /api/todos → 200 {todos,total,page,limit}，种子 10 条'],
  },
  saas: {
    title: 'SaaS Multi-Tenant — 多租户 SaaS',
    positioning:
      '多租户 SaaS 全链路：租户开通事务、成员邀请（7 天 token）、租户内角色、套餐配额、子域隔离、租户控制台。',
    fit: 'B2B 工具站/多组织内容平台/内部多部门系统。',
    notfit: 'C 端个人用户（用 user_id 即可）；需要真订阅计费（Stripe 未集成）；需要 SSO/SCIM。',
    subdomain: 'saas',
    extraVerify: [
      'POST /api/auth/login (account=superadmin, password=admin123) → 200 JWT',
      'GET /api/tenants/mine (Bearer) → 200 含 demo/saas 租户',
      'GET /tenant/login → 200 租户控制台登录页',
    ],
  },
  ecommerce: {
    title: 'Ecommerce — 电商交易形态',
    positioning: '订单/购物车/工单/纠纷仲裁/内容的电商组合，含审批流工单与争议仲裁状态机。',
    fit: '交易类应用原型；需要工单与仲裁流程的业务。',
    notfit: '真实支付（订单为演示数据，未接支付网关）。',
    subdomain: 'shop',
    extraVerify: ['GET /api/orders-mock → 200 订单演示数据', 'GET /api/todos → 200'],
  },
  forum: {
    title: 'Forum — 社区论坛形态',
    positioning: '内容 + 权限 + 管理后台 + 通知的社区组合，内容发布/审核/公开浏览全链。',
    fit: '社区/论坛/博客平台原型；内容审核流场景。',
    notfit: '需要用户动态/实时聊天（未含 chat 模块）。',
    subdomain: 'forum',
    extraVerify: ['GET /api/public/contents → 200 已发布内容列表', 'GET /api/topics → 200 话题'],
  },
  'xbrowser-marketplace': {
    title: 'XBrowser Marketplace — 插件市场',
    positioning: '插件上架/审核/安装/评价全生命周期 + 商家端 + 订单工单纠纷，最复杂的业务形态。',
    fit: '浏览器插件/应用市场类平台；需要审核流的 UGC 平台。',
    notfit: '轻量工具站（模块多，按需取舍）。',
    subdomain: 'market',
    extraVerify: [
      'GET /api/plugins/search?q=a → 200 搜索',
      'GET /api/plugins/pending → 200/401 审核队列',
    ],
  },
  minimal: {
    title: 'Minimal — 极简单模块',
    positioning: '只有 todos 一个业务模块的极简形态，脚手架的最小可用子集。',
    fit: '验证部署链路；作为从零学习模板结构的起点。',
    notfit: '任何真实业务（它就是最小骨架）。',
    subdomain: 'minimal',
    extraVerify: ['GET /api/todos → 200 种子数据'],
  },
}

/** 从 modules.config.ts 提取 preset 定义（简单解析，避免引入 ts 依赖） */
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

/** 从 manifest 文件提取路由路径与描述 */
function extractRoutes(moduleName: string): string[] {
  const dir = join(MODULES_DIR, `module-${moduleName}`)
  if (!existsSync(dir)) return []
  const routes: string[] = []
  const routesDir = join(dir, 'routes')
  const files = existsSync(routesDir) ? readdirSync(routesDir).filter(f => f.endsWith('.ts')) : []
  for (const f of files) {
    const s = readFileSync(join(routesDir, f), 'utf-8')
    const seen = new Set<string>()
    for (const rm of s.matchAll(/\.(get|post|put|delete|patch)\('([^']+)'/g)) {
      const key = `${rm[1].toUpperCase()} ${rm[2]}`
      if (!seen.has(key)) {
        seen.add(key)
        routes.push(key)
      }
    }
  }
  // OpenAPI 风格路由（createRoute + path: '/xxx'）
  for (const f of files) {
    const s = readFileSync(join(routesDir, f), 'utf-8')
    for (const pm of s.matchAll(/path: '([^']+)'/g)) {
      routes.push(`OPENAPI ${pm[1]}`)
    }
  }
  return routes
}

function main() {
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true })
  const presets = parsePresets()
  let index = '# Preset 目录\n\n| 形态 | 在线 Demo | 文档 | 定位 |\n|---|---|---|---|\n'

  for (const p of presets) {
    const meta = META[p.id] ?? {
      title: p.id,
      positioning: p.description,
      fit: '—',
      notfit: '—',
      subdomain: p.id,
      extraVerify: [],
    }
    const demoUrl = p.id === 'cli-only' ? null : `https://${meta.subdomain}.lpm1.top`

    // 模块职责（manifest description）
    const moduleLines: string[] = []
    const apiLines: string[] = []
    for (const mod of p.modules) {
      const mfPath = join(MODULES_DIR, `module-${mod}`, 'module.ts')
      let desc = '—'
      if (existsSync(mfPath)) {
        const s = readFileSync(mfPath, 'utf-8')
        const dm = s.match(/description:\s*'([^']+)'/)
        if (dm) desc = dm[1]
      }
      moduleLines.push(`| \`${mod}\` | ${desc} |`)
      const routes = extractRoutes(mod)
      if (routes.length > 0) {
        apiLines.push(`\n**${mod}**（${routes.length} 条）：\n`)
        for (const r of routes.slice(0, 40)) apiLines.push(`- \`${r}\``)
      }
    }

    const doc = `# ${meta.title}

> ${meta.positioning}

- **在线演示**：${demoUrl ?? '无（纯 CLI 形态，本地生成使用）'}
- **模块数**：${p.modules.length}
- **官方文档**：https://github.com/dyyz1993/fullstack-scaffold/blob/master/docs/PRESETS/${p.id}.md

## 适用 / 不适用

- **适用**：${meta.fit}
- **不适用**：${meta.notfit}

## 模块清单

| 模块 | 职责 |
|---|---|
${moduleLines.join('\n')}

## API 面

${apiLines.length > 0 ? apiLines.join('\n') : '（CLI-only 形态无 HTTP API，见 CLI 文档）'}

## 验证清单（部署后逐条执行）

${demoUrl ? `- \`curl ${demoUrl}/health\` → 200 \`{"status":"ok"}\`` : '- 本地 `npm run cli -- --help` → 命令列表正常'}
${[...meta.extraVerify.map(v => `- ${v}`)].join('\n')}
- 登录凭据（如适用）：\`superadmin / 123456\`（admin mock）；saas 控制台 \`superadmin / admin123\`

> 本文档由 \`scripts/generate-preset-docs.ts\` 生成——结构化部分来自模块清单，改动模块后请重新生成。
`
    writeFileSync(join(OUT, `${p.id}.md`), doc)
    if (demoUrl) {
      index += `| ${meta.title.split('—')[0].trim()} | ${demoUrl} | [文档](./${p.id}.md) | ${meta.positioning.slice(0, 40)}… |\n`
    } else {
      index += `| ${meta.title.split('—')[0].trim()} | 本地使用 | [文档](./${p.id}.md) | ${meta.positioning.slice(0, 40)}… |\n`
    }
    console.log(`✓ ${p.id}.md`)
  }

  writeFileSync(join(OUT, 'INDEX.md'), index)
  console.log(`✓ INDEX.md（${presets.length} presets）`)
}

main()

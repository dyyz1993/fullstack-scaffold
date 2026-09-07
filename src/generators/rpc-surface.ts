import type { ResolvedPreset } from './template-generator'

/**
 * 生成按模块拆分的 RPC 门面（src/server/rpc-surface.ts）。
 *
 * 这是 TS2589 治理的生成侧：preset 决定包含哪些模块，本生成器扫描
 * 所选模块路由文件的 `export type XxxApiType`（模块级窄类型）与路径段
 * （`path: '/<segment>'`，含嵌套 .route 挂载的递归扫描），生成
 * createApiFacade() 工厂。客户端/admin/测试/CLI 都通过该工厂获得
 * 与旧 mega-merge 类型同形的调用面。
 *
 * 约束（由 eslint 规则 no-merged-api-type-export 强制）：
 * 生成物不得导出 `typeof <链式merge实例>` 或 `ReturnType<typeof <app工厂>>`。
 */

interface RouteFileInfo {
  /** 模块内路由文件相对路径（相对 src/server/），如 module-todos/routes/todos-routes */
  routePath: string
  /** import 时的本地变量前缀（去重后） */
  localName: string
}

interface SegmentSource extends RouteFileInfo {
  /** 路由文件里导出的窄类型名，如 TodosApiType */
  typeName: string
  segments: string[]
}

/** 从路由文件文本提取 `export type XxxApiType = typeof yyy` */
function extractApiTypes(content: string): string[] {
  const re = /export type (\w+ApiType)\s*=\s*typeof\s+(\w+)/g
  const names: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) !== null) names.push(m[1])
  return names
}

/**
 * 提取路径首段（'todos'、'orders-mock'）。
 * 递归扫描嵌套挂载：admin-routes 这类通过 .route('/', subApp) 组合的文件，
 * 其路径在子路由文件里声明。
 */
function extractSegments(
  content: string,
  readRouteFile: (p: string) => string | null,
  baseDir: string,
  depth = 0
): string[] {
  const segs = new Set<string>()
  const pathRe = /path:\s*'\/([a-zA-Z][a-zA-Z-]*)/g
  let m: RegExpExecArray | null
  while ((m = pathRe.exec(content)) !== null) segs.add(m[1])

  if (depth < 3) {
    // 嵌套挂载: import { X } from './sub' + .route('/', X)
    const importRe = /import\s*\{([^}]+)\}\s*from\s*'(\.\/[a-zA-Z-]+)'/g
    while ((m = importRe.exec(content)) !== null) {
      const names = m[1]
        .split(',')
        .map(s => s.trim().split(' as ')[0])
        .filter(Boolean)
      const subPath = m[2].replace(/^\.\//, '')
      // 仅当导入的名字确实被 .route('/', name) 挂载时才递归
      const isMounted = names.some(n =>
        new RegExp(`\\.route\\(\\s*'/'\\s*,\\s*${n}\\s*\\)`).test(content)
      )
      if (!isMounted) continue
      const sub = readRouteFile(`${baseDir}/${subPath}`)
      if (sub) {
        for (const s of extractSegments(sub, readRouteFile, baseDir, depth + 1)) segs.add(s)
      }
    }
  }
  return [...segs]
}

export function generateRpcSurface(
  resolved: ResolvedPreset,
  readRouteFile: (p: string) => string | null
): string {
  const sources: SegmentSource[] = []
  const usedNames = new Set<string>()

  const collect = (
    moduleName: string,
    manifest: { routes: { client?: unknown; admin?: unknown } & Record<string, unknown> },
    key: 'client' | 'admin'
  ) => {
    const raw = (manifest.routes as Record<string, unknown>)[key]
    if (!raw) return
    const list = Array.isArray(raw) ? raw : [raw]
    for (const entry of list as Array<{ importPath: string; exportName: string }>) {
      // importPath 相对模块目录（'./routes/todos-routes'），补上 module-<name>/ 前缀
      const routePath = `module-${moduleName}/${entry.importPath.replace(/^\.\//, '').replace(/\.ts$/, '')}`
      let localName = usedNames.has(entry.exportName)
        ? `${routePath
            .split('/')
            .pop()!
            .replace(/-([a-z])/g, (_, c: string) =>
              c.toUpperCase()
            )}${entry.exportName.charAt(0).toUpperCase()}${entry.exportName.slice(1)}`
        : entry.exportName
      while (usedNames.has(localName)) localName += 'X'
      usedNames.add(localName)

      const content = readRouteFile(routePath)
      if (!content) continue
      const typeNames = extractApiTypes(content)
      const segments = extractSegments(
        content,
        readRouteFile,
        routePath.split('/').slice(0, -1).join('/')
      )
      for (const typeName of typeNames) {
        sources.push({ routePath, localName, typeName, segments })
      }
    }
  }

  for (const [moduleName, manifest] of [...resolved.modules.entries()]) {
    collect(moduleName, manifest as never, 'client')
    collect(moduleName, manifest as never, 'admin')
  }

  // 段 → 多来源（同段跨模块时生成 mergeRpcObjects）
  const segmentOwners = new Map<
    string,
    Array<{ localName: string; typeName: string; routePath: string; idx: number }>
  >()
  sources.forEach((s, idx) => {
    for (const seg of s.segments) {
      const list = segmentOwners.get(seg) ?? []
      list.push({ localName: s.localName, typeName: s.typeName, routePath: s.routePath, idx })
      segmentOwners.set(seg, list)
    }
  })

  const hasMergedSegments = [...segmentOwners.values()].some(owners => owners.length > 1)

  const imports: string[] = [
    `import { hc } from 'hono/client'`,
    ...(hasMergedSegments ? [`import { mergeRpcObjects } from './rpc-merge'`] : []),
  ]
  for (const s of sources) {
    imports.push(`import type { ${s.typeName} } from './${s.routePath}'`)
  }

  const clients: string[] = []
  sources.forEach((s, i) => {
    clients.push(`  const ${s.localName}Client${i} = hc<${s.typeName}>(api, options)`)
  })

  const entries: string[] = []
  const key = (seg: string) => (/^[a-zA-Z][a-zA-Z0-9]*$/.test(seg) ? seg : `'${seg}'`)
  for (const [seg, owners] of segmentOwners) {
    // 同段多来源：与运行时挂载顺序一致（先注册者优先）
    owners.sort((a, b) => a.idx - b.idx)
    const refs = owners.map(o => `${o.localName}Client${o.idx}.${key(seg)}`)
    entries.push(
      refs.length === 1
        ? `      ${key(seg)}: ${refs[0]},`
        : `      ${key(seg)}: mergeRpcObjects(${refs.join(', ')}),`
    )
  }

  return `/**
 * @framework-baseline rpc-surface-v1
 *
 * 按模块拆分的类型安全 RPC 门面（本文件由 CLI 生成，勿手改）。
 * 生成器: src/generators/rpc-surface.ts
 *
 * 每个模块单独实例化窄客户端（深度 = 1 个模块），组装成与旧
 * \`hc<MergedApiType>\` 完全同形的门面。禁止导出链式 merge 类型
 * （eslint: no-merged-api-type-export）。
 */

${imports.join('\n')}

/** hono hc 的选项类型（fetch / webSocket / sse / headers 等） */
export type RpcClientOptions = NonNullable<Parameters<typeof hc>[1]>

/**
 * 创建按模块拆分的 RPC 门面。
 * 调用形态与旧 mega 客户端兼容：facade.api.todos.$get()。
 */
export function createApiFacade(baseUrl: string, options: RpcClientOptions = {}) {
  const api = \`\${baseUrl.replace(/\\/$/, '')}/api\`

${clients.join('\n')}

  return {
    api: {
${entries.join('\n')}
    },
  }
}

export type ApiFacade = ReturnType<typeof createApiFacade>
`
}

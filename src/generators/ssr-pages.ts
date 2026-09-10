import type { ResolvedPreset } from './template-generator'
import { getClientPages } from './template-generator'

/**
 * 生成 src/client/ssr-pages.ts：按 preset 实际包含的页面生成静态导入注册表。
 *
 * 背景：entry-server 的页面级 SSR 需要静态 import（renderToString 解析
 * 不了 React.lazy）。模板全量版静态导入全部 ISR 页面，但小 preset 会裁掉
 * 部分页面（如 todo-app 无 TopicsPage）——悬空导入令生成 app 的 tsc 失败。
 * 因此本文件必须由 CLI 按 preset 生成，只导入该 preset 真实存在的页面。
 */

/** 页面文件名 → ssr-pages 的组件名与 ISR 路由（顺序即注册表顺序） */
const SSR_PAGE_MAP: Array<{ file: string; component: string; route: string; pattern?: string }> = [
  { file: 'TodoPage', component: 'TodoPage', route: '/todos' },
  { file: 'ContentListPage', component: 'ContentListPage', route: '/content' },
  {
    file: 'ContentDetailPage',
    component: 'ContentDetailPage',
    route: '/content/:id',
    pattern: '/content/',
  },
  { file: 'TopicsPage', component: 'TopicsPage', route: '/topics' },
]

export function generateSsrPages(
  resolved: ResolvedPreset,
  pageFileExists: (name: string) => boolean
): string {
  const pages = getClientPages(resolved)
  const available = new Set(pages.map(p => p.name))

  const imports: string[] = []
  const entries: string[] = []
  const patterns: string[] = []

  for (const m of SSR_PAGE_MAP) {
    if (!available.has(m.file) && !pageFileExists(m.file)) continue
    imports.push(`import { ${m.component} } from './pages/${m.file}'`)
    entries.push(`  '${m.route}': ${m.component},`)
    if (m.pattern) {
      patterns.push(`  { prefix: '${m.pattern}', component: ${m.component} },`)
    }
  }

  const noPages = imports.length === 0

  return `/**
 * SSR 静态页面注册表（本文件由 CLI 生成，勿手改）。
 * 生成器: src/generators/ssr-pages.ts
 *
 * renderToString 解析不了 React.lazy——ISR 路由的页面级 SSR 依赖这里的
 * 静态同构组件。只导入本 preset 实际包含的页面（模板全量版会被覆盖）。
 */

import type { ComponentType } from 'react'
${
  noPages
    ? `
// 本 preset 没有关联的 ISR 页面——SSR 输出布局壳 + meta（合理：
// 该 preset 的页面无需 SEO 或均为管理/工具型）
export const SSR_PAGES: Record<string, ComponentType> = {}

export function getSsrPage(_pathname: string): ComponentType | null {
  return null
}
`
    : `
${imports.join('\n')}

export const SSR_PAGES: Record<string, ComponentType> = {
${entries.join('\n')}
}

const SSR_PATTERNS: Array<{ prefix: string; component: ComponentType }> = [
${patterns.join('\n')}
]

/** ISR 路径是否有关联静态组件（决定 body 渲染真实内容还是仅 meta） */
export function getSsrPage(pathname: string): ComponentType | null {
  if (SSR_PAGES[pathname]) return SSR_PAGES[pathname]
  for (const p of SSR_PATTERNS) {
    if (pathname.startsWith(p.prefix)) return p.component
  }
  return null
}
`
}`
}

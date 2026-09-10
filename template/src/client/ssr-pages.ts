/**
 * SSR 静态页面注册表（替代 preset-ui-config 的 lazy 组件用于服务端渲染）。
 *
 * 为什么需要它：renderToString 是同步的，解析不了 React.lazy 的动态
 * import——直接用 preset-ui-config 会让 SSR body 永远是 Suspense 的
 * Loading 壳。这里用静态 import 提供同构组件映射，页面内容在服务端
 * 真正渲染进 HTML（ISR/SEO 的核心价值所在）。
 *
 * 客户端不走这里（CSR 仍用 lazy 代码分割），水合由 entry-server 渲染的
 * HTML + main.tsx 的 hydrateRoot 完成——两侧组件树来自同一源码，静态
 * 导入版多打一份包只进 server bundle（tsup 的 CF 构建），不影响 client
 * chunk 体积。
 */

import type { ComponentType } from 'react'

// 按需静态导入 ISR 场景的页面（内容型、需要 SEO 的页面）
import { TodoPage } from './pages/TodoPage'
import { ContentListPage } from './pages/ContentListPage'
import { ContentDetailPage } from './pages/ContentDetailPage'
import { TopicsPage } from './pages/TopicsPage'

export type SsrPageComponent = ComponentType

/**
 * 路由 → 同构组件映射。
 * 未列出的路由（管理后台、登录页等）SSR 输出布局壳——它们本来就不
 * 需要 SEO（登录后才可见），客户端 lazy 照常工作。
 */
export const SSR_PAGES: Record<string, SsrPageComponent> = {
  '/todos': TodoPage,
  '/content': ContentListPage,
  '/content/:id': ContentDetailPage,
  '/topics': TopicsPage,
}

/** ISR 路径是否有关联的静态组件（决定 body 渲染还是仅 meta） */
export function getSsrPage(pathname: string): SsrPageComponent | null {
  if (SSR_PAGES[pathname]) return SSR_PAGES[pathname]
  // 详情页模式 /content/123
  const m = pathname.match(/^\/content\/[^/]+$/)
  if (m) return SSR_PAGES['/content/:id']
  return null
}

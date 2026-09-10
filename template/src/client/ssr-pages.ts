/**
 * SSR 静态页面注册表（模板全量版；CLI 按 preset 重新生成，只导入实际存在的页面）。
 *
 * renderToString 解析不了 React.lazy——ISR 路由的页面级 SSR 依赖这里的
 * 静态同构组件，页面内容才真正渲染进 HTML（SEO/首屏的核心价值）。
 */

import type { ComponentType } from 'react'
import { TodoPage } from './pages/TodoPage'
import { ContentListPage } from './pages/ContentListPage'
import { ContentDetailPage } from './pages/ContentDetailPage'
import { TopicsPage } from './pages/TopicsPage'

export type SsrPageComponent = ComponentType

export const SSR_PAGES: Record<string, SsrPageComponent> = {
  '/todos': TodoPage,
  '/content': ContentListPage,
  '/content/:id': ContentDetailPage,
  '/topics': TopicsPage,
}

const SSR_PATTERNS: Array<{ prefix: string; component: SsrPageComponent }> = [
  { prefix: '/content/', component: ContentDetailPage },
]

export function getSsrPage(pathname: string): SsrPageComponent | null {
  if (SSR_PAGES[pathname]) return SSR_PAGES[pathname]
  for (const p of SSR_PATTERNS) {
    if (pathname.startsWith(p.prefix)) return p.component
  }
  return null
}

/**
 * Todos module ISR routes (meta-only).
 * Registered into isrRegistry at import time.
 * Fetches data for SEO meta tags — body rendering handled by React SPA.
 */

import { isrRegistry, type ISRRouteEntry } from '@server/core/isr-registry'

interface TodoData {
  todos: Array<{ id: number; title: string; status: string }>
}

async function fetchTodos(_pathname: string, _ctx?: ISRRouterContext): Promise<TodoData> {
  // ISR HTML 是匿名共享缓存，嵌入任何租户/用户的待办都会造成跨租户泄漏
  // （匿名访客也曾能看到 tenant 维度数据）。本条目仅贡献 SEO meta，
  // 列表数据一律由 SPA 水合后按请求者身份从 /api/todos 拉取。
  return { todos: [] }
}

function todoMeta(): { title: string; description: string } {
  return {
    title: 'Todo List - Biomimic App',
    description: 'Manage your todos with real-time updates',
  }
}

const todosEntries: ISRRouteEntry[] = [
  {
    module: 'todos',
    match: '/todos',
    fetch: fetchTodos,
    meta: () => todoMeta(),
  },
  {
    module: 'todos',
    match: '/',
    fetch: fetchTodos,
    meta: () => todoMeta(),
  },
]

isrRegistry.registerMany(todosEntries)

/**
 * Todos module ISR routes (meta-only).
 * Registered into isrRegistry at import time.
 * Fetches data for SEO meta tags — body rendering handled by React SPA.
 */

import { isrRegistry, type ISRRouteEntry, type ISRRouterContext } from '@server/core/isr-registry'
import { listTodos } from './services/todo-service'

interface TodoData {
  todos: Array<{ id: number; title: string; status: string }>
}

async function fetchTodos(pathname: string, ctx?: ISRRouterContext): Promise<TodoData> {
  // 已认证请求：ISR HTML 是匿名共享缓存，嵌入任何用户的待办都会跨租户泄漏。
  // 返回空列表，SPA 水合后按请求者身份从 /api/todos 拉取。
  if (ctx?.isAuthenticated) {
    return { todos: [] }
  }
  const { todos } = await listTodos({ limit: 20 })
  return { todos }
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

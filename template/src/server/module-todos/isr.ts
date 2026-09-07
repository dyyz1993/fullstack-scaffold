/**
 * Todos module ISR routes (meta-only).
 * Registered into isrRegistry at import time.
 * Fetches data for SEO meta tags — body rendering handled by React SPA.
 */

import { isrRegistry, type ISRRouteEntry } from '@server/core/isr-registry'
import { listTodos } from './services/todo-service'

interface TodoData {
  todos: Array<{ id: number; title: string; status: string }>
}

async function fetchTodos(_pathname: string): Promise<TodoData> {
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

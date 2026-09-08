/**
 * @framework-baseline 2c3eaa60a64308e8
 *
 *
 * @framework-modify
 * @reason prettier 格式化与注释结构整理；MockContent 字段收窄为字面量联合
 * @impact 框架文件维护性修改，行为见测试
 */

/**
 * ISR test utilities — mock DB, mock service responses, time manipulation.
 */

import { createISRCache } from '@server/core/isr-cache'
import { createISRRegistry, type ISRRouteEntry } from '@server/core/isr-registry'

export interface MockTodo {
  id: number
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed'
  createdAt: string
  updatedAt: string
}

export interface MockContent {
  id: string
  title: string
  content: string
  category: 'article' | 'announcement' | 'tutorial' | 'news' | 'policy'
  status: 'draft' | 'published' | 'archived'
  author: string
  tags: string[]
  viewCount: number
  likeCount: number
  createdAt: string
  updatedAt: string
  publishedAt?: string
}

export const mockTodos: MockTodo[] = [
  {
    id: 1,
    title: '学习 ISR',
    status: 'completed',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  },
  {
    id: 2,
    title: '部署 CF',
    status: 'completed',
    createdAt: '2024-01-03T00:00:00.000Z',
    updatedAt: '2024-01-04T00:00:00.000Z',
  },
  {
    id: 3,
    title: '写测试',
    status: 'in_progress',
    createdAt: '2024-01-05T00:00:00.000Z',
    updatedAt: '2024-01-06T00:00:00.000Z',
  },
  {
    id: 4,
    title: '优化 SEO',
    status: 'pending',
    createdAt: '2024-01-07T00:00:00.000Z',
    updatedAt: '2024-01-08T00:00:00.000Z',
  },
]

export const mockContents: MockContent[] = [
  {
    id: 'content-1',
    title: 'ISR 完全指南',
    content: 'ISR 是一种页面渲染策略...',
    category: 'article',
    status: 'published',
    author: '技术团队',
    tags: ['ISR', 'Cloudflare'],
    viewCount: 128,
    likeCount: 32,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
    publishedAt: '2024-01-02T00:00:00.000Z',
  },
  {
    id: 'content-2',
    title: 'CF Workers 最佳实践',
    content: '本文总结 CF Workers 部署经验...',
    category: 'tutorial',
    status: 'published',
    author: '运维团队',
    tags: ['Cloudflare', 'DevOps'],
    viewCount: 256,
    likeCount: 48,
    createdAt: '2024-01-03T00:00:00.000Z',
    updatedAt: '2024-01-04T00:00:00.000Z',
    publishedAt: '2024-01-04T00:00:00.000Z',
  },
]

/**
 * Create a test ISR setup with isolated registry and cache.
 */
export function createTestISR() {
  const registry = createISRRegistry()
  const cache = createISRCache({ maxAge: 1, staleWhileRevalidate: 2 })

  return { registry, cache }
}

/**
 * Create mock ISR route entries for testing.
 */
export function createMockTodoEntries(todos: MockTodo[] = mockTodos): ISRRouteEntry[] {
  return [
    {
      module: 'todos',
      match: '/todos',
      fetch: async () => ({ todos }),
      meta: () => ({ title: 'Todo List', description: 'Todos page' }),
    },
  ]
}

/**
 * Advance virtual time (for testing cache expiry without real waits).
 * Returns a promise that resolves after the specified ms.
 */
export async function advanceTime(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Extract text content from HTML tags.
 */
export function extractFromHTML(html: string, pattern: RegExp): string[] {
  return html.match(pattern) ?? []
}

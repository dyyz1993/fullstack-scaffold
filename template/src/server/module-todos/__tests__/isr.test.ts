import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the todo service BEFORE importing isr.ts
vi.mock('@server/module-todos/services/todo-service', () => ({
  listTodos: vi.fn(),
}))

import { listTodos } from '@server/module-todos/services/todo-service'
import type { MockTodo } from '@server/test-utils/test-isr-helper'

// Side-effect: register ISR routes into global registry
import '@server/module-todos/isr'

const mockTodosData: MockTodo[] = [
  {
    id: 1,
    title: 'Task A',
    status: 'completed',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    title: 'Task B',
    status: 'pending',
    createdAt: '2024-01-02T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  },
  {
    id: 3,
    title: 'Task C',
    status: 'in_progress',
    createdAt: '2024-01-03T00:00:00.000Z',
    updatedAt: '2024-01-03T00:00:00.000Z',
  },
]

describe('Todos Module ISR', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('route registration', () => {
    it('should register /todos route', async () => {
      vi.mocked(listTodos).mockResolvedValue({ todos: mockTodosData, total: 3, page: 1, limit: 20 })

      // Dynamic import to trigger registration into fresh registry
      // Since isr.ts registers into the global registry, we test the global one
      const { isrRegistry } = await import('@server/core/isr-registry')
      // The global registry already has todos from the side-effect import
      expect(isrRegistry.match('/todos')).not.toBeNull()
      expect(isrRegistry.match('/todos')!.module).toBe('todos')
    })

    it('should register / route', async () => {
      const { isrRegistry } = await import('@server/core/isr-registry')
      const entry = isrRegistry.match('/')
      expect(entry).not.toBeNull()
      expect(entry!.module).toBe('todos')
    })
  })

  describe('data fetching', () => {
    // ISR HTML 是匿名共享缓存：嵌入任何租户/用户的待办都会跨租户泄漏，
    // 因此 fetch 恒返回空列表（meta-only），数据由 SPA 按身份拉取
    it('should always return empty todos (meta-only, no cross-tenant leak)', async () => {
      const { isrRegistry } = await import('@server/core/isr-registry')
      const entry = isrRegistry.match('/todos')!
      const data = (await entry.fetch('/todos', { isAuthenticated: false })) as {
        todos: MockTodo[]
      }

      expect(data.todos).toHaveLength(0)
    })

    it('should return empty todos even when authenticated', async () => {
      const { isrRegistry } = await import('@server/core/isr-registry')
      const entry = isrRegistry.match('/todos')!
      const data = (await entry.fetch('/todos', { isAuthenticated: true })) as {
        todos: MockTodo[]
      }

      expect(data.todos).toHaveLength(0)
    })
  })

  describe('meta tags', () => {
    it('should return correct meta', async () => {
      const { isrRegistry } = await import('@server/core/isr-registry')
      const entry = isrRegistry.match('/todos')!
      const meta = entry.meta({}, '/todos')

      expect(meta.title).toContain('Todo List')
      expect(meta.description).toContain('todos')
    })
  })
})

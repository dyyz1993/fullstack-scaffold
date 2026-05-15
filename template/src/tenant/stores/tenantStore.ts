import { create } from 'zustand'
import { hc } from 'hono/client'
import type { AppType } from '@server/index'
import type {
  Tenant,
  UpdateTenantInput,
  Todo,
  CreateTodoInput,
  UpdateTodoInput,
  Topic,
} from '@shared/schemas'
import type { WSClientImpl } from '@shared/core/ws-client'
import type { SSEClientImpl } from '@shared/core/sse-client'

interface TenantState {
  isAuthenticated: boolean
  currentTenant: Tenant | null
  loading: boolean
  users: unknown[]
  todos: Todo[]
  topics: Topic[]
  stats: TenantStats
  subscription: unknown

  setCurrentTenant: (tenant: Tenant | null) => void
  fetchCurrentTenant: (slug: string) => Promise<void>
  fetchUsers: () => Promise<void>
  createUser: (data: unknown) => Promise<boolean>
  updateUser: (userId: number, data: unknown) => Promise<boolean>
  deleteUser: (userId: number) => Promise<boolean>
  fetchTodos: () => Promise<void>
  createTodo: (data: CreateTodoInput) => Promise<boolean>
  updateTodo: (todoId: number, data: UpdateTodoInput) => Promise<boolean>
  deleteTodo: (todoId: number) => Promise<boolean>
  fetchTopics: () => Promise<void>
  createTopic: (data: unknown) => Promise<boolean>
  updateTopic: (topicId: number, data: unknown) => Promise<boolean>
  deleteTopic: (topicId: number) => Promise<boolean>
  fetchSubscription: () => Promise<void>
  updateTenant: (tenantId: number, data: UpdateTenantInput) => Promise<boolean>
  fetchStats: () => Promise<void>
  setLoading: (loading: boolean) => void
  startLoading: (text?: string) => void
  stopLoading: () => void
}

let apiClient: ReturnType<typeof hc<AppType>> | null = null

function createTenantClient(): ReturnType<typeof hc<AppType>> {
  if (!apiClient) {
    const tenantSlug = localStorage.getItem('current-tenant-slug') || ''
    const baseUrl = import.meta.env.API_BASE_URL || window.location.origin

    apiClient = hc<AppType>(baseUrl, {
      webSocket: (url: string) => {
        const wsClass = class extends WebSocket {
          constructor(urlStr: string) {
            super(urlStr)
            this.addEventListener('open', () => {
              if (this instanceof WebSocket) {
                this.send(
                  JSON.stringify({
                    type: 'auth',
                    token: localStorage.getItem('tenant-token') || '',
                  })
                )
              }
            })
          }
        }
        return new wsClass(url) as unknown as WSClientImpl
      },
      sse: (url: string) => {
        const eventSourceClass = class extends EventSource {
          constructor(urlStr: string, eventSourceInitDict?: EventSourceInit) {
            const headers = eventSourceInitDict || {}
            headers['X-Tenant-Slug'] = tenantSlug
            super(urlStr, headers)
          }
        }
        return new eventSourceClass(url) as unknown as SSEClientImpl
      },
    })
  }
  return apiClient
}

function getTenantSlug(): string {
  return localStorage.getItem('current-tenant-slug') || ''
}

interface TenantStats {
  totalUsers: number
  activeTodos: number
  contentCount: number
  monthlyRevenue: number
}

export const useTenantStore = create<TenantState>(set => ({
  isAuthenticated: !!localStorage.getItem('tenant-token'),
  currentTenant: null,
  loading: false,
  users: [],
  todos: [],
  topics: [],
  stats: {
    totalUsers: 0,
    activeTodos: 0,
    contentCount: 0,
    monthlyRevenue: 0,
  },
  subscription: null,

  setCurrentTenant: tenant => set({ currentTenant: tenant }),

  setLoading: loading => set({ loading }),

  fetchCurrentTenant: async slug => {
    set({ loading: true })
    try {
      const client = createTenantClient()
      const response = await client.api.tenant.slug.$get({
        param: { slug },
        headers: { 'X-Tenant-Slug': slug },
      })
      const result = await response.json()

      if (result.success) {
        set({ currentTenant: result.data })
      }
    } catch (error) {
      console.error('Failed to fetch tenant:', error)
    } finally {
      set({ loading: false })
    }
  },

  fetchUsers: async () => {
    set({ loading: true })
    try {
      const client = createTenantClient()
      const tenantSlug = getTenantSlug()
      const response = await client.api.users.$get({
        headers: { 'X-Tenant-Slug': tenantSlug },
      })
      const result = await response.json()

      if (result.success) {
        set({ users: result.data })
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      set({ loading: false })
    }
  },

  createUser: async data => {
    try {
      const client = createTenantClient()
      const tenantSlug = getTenantSlug()
      const response = await client.api.users.$post({
        json: data,
        headers: { 'X-Tenant-Slug': tenantSlug },
      })
      const result = await response.json()
      return result.success
    } catch (error) {
      console.error('Failed to create user:', error)
      return false
    }
  },

  updateUser: async (userId, data) => {
    try {
      const client = createTenantClient()
      const tenantSlug = getTenantSlug()
      const response = await client.api.users[':id'].$put({
        param: { id: userId.toString() },
        json: data,
        headers: { 'X-Tenant-Slug': tenantSlug },
      })
      const result = await response.json()
      return result.success
    } catch (error) {
      console.error('Failed to update user:', error)
      return false
    }
  },

  deleteUser: async userId => {
    try {
      const client = createTenantClient()
      const tenantSlug = getTenantSlug()
      const response = await client.api.users[':id'].$delete({
        param: { id: userId.toString() },
        headers: { 'X-Tenant-Slug': tenantSlug },
      })
      const result = await response.json()
      return result.success
    } catch (error) {
      console.error('Failed to delete user:', error)
      return false
    }
  },

  fetchTodos: async () => {
    set({ loading: true })
    try {
      const client = createTenantClient()
      const tenantSlug = getTenantSlug()
      const response = await client.api.todos.$get({
        headers: { 'X-Tenant-Slug': tenantSlug },
      })
      const result = await response.json()

      if (result.success) {
        set({ todos: result.data })
      }
    } catch (error) {
      console.error('Failed to fetch todos:', error)
    } finally {
      set({ loading: false })
    }
  },

  createTodo: async data => {
    try {
      const client = createTenantClient()
      const tenantSlug = getTenantSlug()
      const response = await client.api.todos.$post({
        json: data,
        headers: { 'X-Tenant-Slug': tenantSlug },
      })
      const result = await response.json()
      return result.success
    } catch (error) {
      console.error('Failed to create todo:', error)
      return false
    }
  },

  updateTodo: async (todoId, data) => {
    try {
      const client = createTenantClient()
      const tenantSlug = getTenantSlug()
      const response = await client.api.todos[':id'].$put({
        param: { id: todoId.toString() },
        json: data,
        headers: { 'X-Tenant-Slug': tenantSlug },
      })
      const result = await response.json()
      return result.success
    } catch (error) {
      console.error('Failed to update todo:', error)
      return false
    }
  },

  deleteTodo: async todoId => {
    try {
      const client = createTenantClient()
      const tenantSlug = getTenantSlug()
      const response = await client.api.todos[':id'].$delete({
        param: { id: todoId.toString() },
        headers: { 'X-Tenant-Slug': tenantSlug },
      })
      const result = await response.json()
      return result.success
    } catch (error) {
      console.error('Failed to delete todo:', error)
      return false
    }
  },

  fetchTopics: async () => {
    set({ loading: true })
    try {
      const client = createTenantClient()
      const tenantSlug = getTenantSlug()
      const response = await client.api.topics.$get({
        headers: { 'X-Tenant-Slug': tenantSlug },
      })
      const result = await response.json()

      if (result.success) {
        set({ topics: result.data })
      }
    } catch (error) {
      console.error('Failed to fetch topics:', error)
    } finally {
      set({ loading: false })
    }
  },

  createTopic: async data => {
    try {
      const client = createTenantClient()
      const tenantSlug = getTenantSlug()
      const response = await client.api.topics.$post({
        json: data,
        headers: { 'X-Tenant-Slug': tenantSlug },
      })
      const result = await response.json()
      return result.success
    } catch (error) {
      console.error('Failed to create topic:', error)
      return false
    }
  },

  updateTopic: async (topicId, data) => {
    try {
      const client = createTenantClient()
      const tenantSlug = getTenantSlug()
      const response = await client.api.topics[':id'].$put({
        param: { id: topicId.toString() },
        json: data,
        headers: { 'X-Tenant-Slug': tenantSlug },
      })
      const result = await response.json()
      return result.success
    } catch (error) {
      console.error('Failed to update topic:', error)
      return false
    }
  },

  deleteTopic: async topicId => {
    try {
      const client = createTenantClient()
      const tenantSlug = getTenantSlug()
      const response = await client.api.topics[':id'].$delete({
        param: { id: topicId.toString() },
        headers: { 'X-Tenant-Slug': tenantSlug },
      })
      const result = await response.json()
      return result.success
    } catch (error) {
      console.error('Failed to delete topic:', error)
      return false
    }
  },

  fetchSubscription: async () => {
    set({ loading: true })
    try {
      const client = createTenantClient()
      const tenantSlug = getTenantSlug()
      const response = await client.api.subscription.$get({
        headers: { 'X-Tenant-Slug': tenantSlug },
      })
      const result = await response.json()

      if (result.success) {
        set({ subscription: result.data })
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error)
    } finally {
      set({ loading: false })
    }
  },

  updateTenant: async (tenantId, data) => {
    try {
      const client = createTenantClient()
      const tenantSlug = getTenantSlug()
      const response = await client.api.tenants[':id'].$put({
        param: { id: tenantId.toString() },
        json: data,
        headers: { 'X-Tenant-Slug': tenantSlug },
      })
      const result = await response.json()

      if (result.success) {
        set({ currentTenant: result.data })
      }

      return result.success
    } catch (error) {
      console.error('Failed to update tenant:', error)
      return false
    }
  },

  fetchStats: async () => {
    try {
      const client = createTenantClient()
      const tenantSlug = getTenantSlug()
      const response = await client.api.stats.$get({
        headers: { 'X-Tenant-Slug': tenantSlug },
      })
      const result = await response.json()

      if (result.success) {
        set({ stats: result.data })
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  },

  startLoading: (_text?: string) => {
    set({ loading: true })
  },

  stopLoading: () => {
    set({ loading: false })
  },
}))

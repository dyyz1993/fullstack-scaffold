import { create } from 'zustand'
import type {
  Tenant,
  UpdateTenantInput,
  Todo,
  CreateTodoInput,
  UpdateTodoInput,
  Topic,
} from '@shared/schemas'

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

  fetchUsers: async () => {
    console.warn('User management not implemented for tenant module')
  },

  createUser: async () => {
    console.warn('User creation not implemented for tenant module')
    return false
  },

  updateUser: async () => {
    console.warn('User update not implemented for tenant module')
    return false
  },

  deleteUser: async () => {
    console.warn('User deletion not implemented for tenant module')
    return false
  },

  createTopic: async () => {
    console.warn('Topic creation not implemented for tenant module')
    return false
  },

  updateTopic: async () => {
    console.warn('Topic update not implemented for tenant module')
    return false
  },

  deleteTopic: async () => {
    console.warn('Topic deletion not implemented for tenant module')
    return false
  },

  fetchSubscription: async () => {
    console.warn('Subscription management not implemented for tenant module')
  },

  fetchCurrentTenant: async (_slug: string) => {
    console.warn('Tenant routes not registered - tenant module not active')
  },

  fetchTodos: async () => {
    console.warn('Tenant routes not registered - tenant module not active')
  },

  createTodo: async () => {
    console.warn('Tenant routes not registered - tenant module not active')
    return false
  },

  updateTodo: async () => {
    console.warn('Tenant routes not registered - tenant module not active')
    return false
  },

  deleteTodo: async () => {
    console.warn('Tenant routes not registered - tenant module not active')
    return false
  },

  fetchTopics: async () => {
    console.warn('Tenant routes not registered - tenant module not active')
  },

  updateTenant: async () => {
    console.warn('Tenant routes not registered - tenant module not active')
    return false
  },

  fetchStats: async () => {
    console.warn('Stats endpoint not implemented for tenant module')
  },

  startLoading: (_text?: string) => {
    set({ loading: true })
  },

  stopLoading: () => {
    set({ loading: false })
  },
}))

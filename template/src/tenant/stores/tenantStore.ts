import { create } from 'zustand'
import type {
  Tenant,
  UpdateTenantInput,
  Todo,
  CreateTodoInput,
  UpdateTodoInput,
  Topic,
  TenantMember,
  TenantRole,
} from '@shared/schemas'
import { api, setToken, setSlug, getToken } from '../services/tenantApi'

interface TenantState {
  isAuthenticated: boolean
  currentTenant: Tenant | null
  /** 登录账号（Header 欢迎语用，替代写死的 "Tenant Admin"） */
  account: string | null
  loading: boolean
  users: TenantMember[]
  roles: TenantRole[]
  todos: Todo[]
  topics: Topic[]
  stats: TenantStats
  subscription: TenantSubscription | null

  login: (
    account: string,
    password: string
  ) => Promise<{ ok: boolean; hasTenant: boolean; error?: string }>
  /** 有 token 无租户上下文时（如邀请接受后）从 /tenants/mine 恢复 */
  restoreFromToken: () => Promise<void>
  logout: () => void
  setCurrentTenant: (tenant: Tenant | null) => void
  fetchCurrentTenant: (slug: string) => Promise<void>
  fetchUsers: () => Promise<void>
  inviteUser: (email: string, roleId: string) => Promise<boolean>
  updateUser: (userId: string, data: { roleId: string }) => Promise<boolean>
  deleteUser: (userId: string) => Promise<boolean>
  fetchRoles: () => Promise<void>
  fetchTodos: () => Promise<void>
  createTodo: (data: CreateTodoInput) => Promise<boolean>
  updateTodo: (todoId: number, data: UpdateTodoInput) => Promise<boolean>
  deleteTodo: (todoId: number) => Promise<boolean>
  fetchTopics: () => Promise<void>
  createTopic: (data: unknown) => Promise<boolean>
  updateTopic: (topicId: string | number, data: unknown) => Promise<boolean>
  deleteTopic: (topicId: string | number) => Promise<boolean>
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

/** 订阅信息由租户 plan/maxUsers 派生（P4 在服务端执行配额） */
interface TenantSubscription {
  plan: string
  maxUsers: number
  currentUsers: number
}

export const useTenantStore = create<TenantState>((set, getState) => ({
  isAuthenticated: !!getToken(),
  currentTenant: null,
  account: null,
  loading: false,
  users: [],
  roles: [],
  todos: [],
  topics: [],
  stats: {
    totalUsers: 0,
    activeTodos: 0,
    contentCount: 0,
    monthlyRevenue: 0,
  },
  subscription: null,

  // 登录 = 平台认证 + mine 选定租户（取第一个成员租户）
  login: async (account, password) => {
    set({ loading: true })
    try {
      const loginRes = await api<{ token: string }>('/auth/login', {
        method: 'POST',
        // account + username 双字段：不同 preset 的 LoginSchema 字段名不同
        //（saas 用 account，fullstack-admin 等用 username），双发保证兼容
        body: { account, username: account, password },
      })
      if (!loginRes.success || !loginRes.data?.token) {
        return { ok: false, hasTenant: false, error: 'Invalid credentials' }
      }
      setToken(loginRes.data.token)

      const mineRes = await api<Tenant[]>('/tenants/mine')
      // 认证已成功——无租户账号保留 token（受邀新用户需登录态接受邀请），
      // 由调用方引导回邀请落地页而非硬拒
      if (!mineRes.success || !mineRes.data || mineRes.data.length === 0) {
        set({ account })
        return { ok: true, hasTenant: false }
      }

      const tenant = mineRes.data[0]
      setSlug(tenant.slug)
      set({ isAuthenticated: true, currentTenant: tenant, account })
      return { ok: true, hasTenant: true }
    } finally {
      set({ loading: false })
    }
  },

  restoreFromToken: async () => {
    if (!getToken()) return
    const mineRes = await api<Tenant[]>('/tenants/mine')
    if (mineRes.success && mineRes.data && mineRes.data.length > 0) {
      const tenant = mineRes.data[0]
      setSlug(tenant.slug)
      set({ isAuthenticated: true, currentTenant: tenant })
    }
  },

  logout: () => {
    setToken(null)
    setSlug(null)
    set({ isAuthenticated: false, currentTenant: null, account: null, users: [], todos: [] })
  },

  setCurrentTenant: tenant => set({ currentTenant: tenant }),

  setLoading: loading => set({ loading }),

  fetchCurrentTenant: async slug => {
    if (!getToken()) {
      set({ isAuthenticated: false })
      return
    }
    const res = await api<Tenant>(`/tenants/slug/${slug}`)
    if (res.success && res.data) {
      set({ isAuthenticated: true, currentTenant: res.data })
      return
    }
    // 仅认证确实失效（401）才回登录；429/网络错误按瞬态跳过，
    // 否则限流抖动会把已登录用户弹出去
    if (res.status === 401) {
      set({ isAuthenticated: false })
    }
  },

  fetchRoles: async () => {
    const tenant = getState().currentTenant
    if (!tenant) return
    const res = await api<TenantRole[]>(`/tenants/${tenant.id}/roles`)
    if (res.success && res.data) set({ roles: res.data })
  },

  fetchUsers: async () => {
    const tenant = getState().currentTenant
    if (!tenant) return
    const res = await api<TenantMember[]>(`/tenants/${tenant.id}/members`)
    if (res.success && res.data) set({ users: res.data })
  },

  inviteUser: async (email, roleId) => {
    const tenant = getState().currentTenant
    if (!tenant) return false
    const res = await api(`/tenants/${tenant.id}/members/invite`, {
      method: 'POST',
      body: { email, roleId },
    })
    return res.success
  },

  updateUser: async (memberId, data) => {
    const tenant = getState().currentTenant
    if (!tenant) return false
    const res = await api(`/tenants/${tenant.id}/members/${memberId}`, {
      method: 'PUT',
      body: data,
    })
    return res.success
  },

  deleteUser: async memberId => {
    const tenant = getState().currentTenant
    if (!tenant) return false
    const res = await api(`/tenants/${tenant.id}/members/${memberId}`, { method: 'DELETE' })
    return res.success
  },

  fetchTodos: async () => {
    const res = await api<{ todos: Todo[]; total: number }>('/todos?limit=100')
    if (res.success && res.data) set({ todos: res.data.todos })
  },

  createTodo: async data => {
    const res = await api<Todo>('/todos', { method: 'POST', body: data })
    if (res.success) await getState().fetchTodos()
    return res.success
  },

  updateTodo: async (todoId, data) => {
    const res = await api<Todo>(`/todos/${todoId}`, { method: 'PUT', body: data })
    if (res.success) await getState().fetchTodos()
    return res.success
  },

  deleteTodo: async todoId => {
    const res = await api(`/todos/${todoId}`, { method: 'DELETE' })
    if (res.success) await getState().fetchTodos()
    return res.success
  },

  fetchTopics: async () => {
    const res = await api<Topic[]>('/public/topics?limit=50')
    if (res.success && res.data) set({ topics: res.data })
  },

  createTopic: async () => false,

  updateTopic: async () => false,

  deleteTopic: async () => false,

  fetchSubscription: async () => {
    const tenant = getState().currentTenant
    if (!tenant) return
    const members = await api<TenantMember[]>(`/tenants/${tenant.id}/members`)
    set({
      subscription: {
        plan: tenant.plan,
        maxUsers: tenant.maxUsers,
        currentUsers: members.data?.length ?? 0,
      },
    })
  },

  updateTenant: async (tenantId, data) => {
    const res = await api<Tenant>(`/tenants/${tenantId}`, { method: 'PUT', body: data })
    if (res.success && res.data) {
      set({ currentTenant: res.data })
      return true
    }
    return false
  },

  fetchStats: async () => {
    const tenant = getState().currentTenant
    if (!tenant) return
    const [members, todos] = await Promise.all([
      api<TenantMember[]>(`/tenants/${tenant.id}/members`),
      api<{ todos: Todo[]; total: number }>('/todos?limit=100'),
    ])
    const activeTodos = (todos.data?.todos ?? []).filter(t => t.status !== 'completed').length
    set({
      stats: {
        totalUsers: members.data?.length ?? 0,
        activeTodos,
        contentCount: 0,
        monthlyRevenue: 0,
      },
    })
  },

  startLoading: (_text?: string) => {
    set({ loading: true })
  },

  stopLoading: () => {
    set({ loading: false })
  },
}))

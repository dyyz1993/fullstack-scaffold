import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RoleType } from '@shared/modules/role/schemas'

export interface Tenant {
  id: string
  code: string
  name: string
  slug: string
  logo: string | null
  description: string | null
  plan: string
  status: string
  maxMembers: number | null
  maxStorage: number | null
  ownerId: string
  createdAt: number | null
  updatedAt: number | null
}

export type TenantRole = Pick<
  RoleType,
  'id' | 'code' | 'name' | 'label' | 'description' | 'isSystem' | 'isActive' | 'sortOrder'
> & {
  tenantId: string
  permissions: string
}

export interface TenantMember {
  id: string
  tenantId: string
  userId: string
  roleId: string
  status: string
  invitedBy: string | null
  invitedAt: number | null
  joinedAt: number | null
  lastActiveAt: number | null
  role: TenantRole
}

export interface TenantInvitation {
  id: string
  tenantId: string
  email: string
  roleId: string
  inviterId: string
  token: string
  status: string
  expiresAt: number | null
  createdAt: number | null
}

interface TenantState {
  tenants: Tenant[]
  currentTenant: Tenant | null
  roles: TenantRole[]
  members: TenantMember[]
  permissions: string[]
  isLoading: boolean
  error: string | null

  setTenants: (tenants: Tenant[]) => void
  setCurrentTenant: (tenant: Tenant | null) => void
  setRoles: (roles: TenantRole[]) => void
  setMembers: (members: TenantMember[]) => void
  setPermissions: (permissions: string[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  addTenant: (tenant: Tenant) => void
  updateTenant: (id: string, data: Partial<Tenant>) => void
  removeTenant: (id: string) => void
  addMember: (member: TenantMember) => void
  updateMember: (id: string, data: Partial<TenantMember>) => void
  removeMember: (id: string) => void
  addRole: (role: TenantRole) => void
  updateRole: (id: string, data: Partial<TenantRole>) => void
  removeRole: (id: string) => void
  hasPermission: (permission: string) => boolean
  reset: () => void
}

const initialState = {
  tenants: [],
  currentTenant: null,
  roles: [],
  members: [],
  permissions: [],
  isLoading: false,
  error: null,
}

export const useTenantStore = create<TenantState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setTenants: tenants => set({ tenants }),
      setCurrentTenant: tenant => set({ currentTenant: tenant }),
      setRoles: roles => set({ roles }),
      setMembers: members => set({ members }),
      setPermissions: permissions => set({ permissions }),
      setLoading: isLoading => set({ isLoading }),
      setError: error => set({ error }),

      addTenant: tenant =>
        set(state => ({
          tenants: [...state.tenants, tenant],
        })),

      updateTenant: (id, data) =>
        set(state => ({
          tenants: state.tenants.map(t => (t.id === id ? { ...t, ...data } : t)),
          currentTenant:
            state.currentTenant?.id === id
              ? { ...state.currentTenant, ...data }
              : state.currentTenant,
        })),

      removeTenant: id =>
        set(state => ({
          tenants: state.tenants.filter(t => t.id !== id),
          currentTenant: state.currentTenant?.id === id ? null : state.currentTenant,
        })),

      addMember: member =>
        set(state => ({
          members: [...state.members, member],
        })),

      updateMember: (id, data) =>
        set(state => ({
          members: state.members.map(m => (m.id === id ? { ...m, ...data } : m)),
        })),

      removeMember: id =>
        set(state => ({
          members: state.members.filter(m => m.id !== id),
        })),

      addRole: role =>
        set(state => ({
          roles: [...state.roles, role],
        })),

      updateRole: (id, data) =>
        set(state => ({
          roles: state.roles.map(r => (r.id === id ? { ...r, ...data } : r)),
        })),

      removeRole: id =>
        set(state => ({
          roles: state.roles.filter(r => r.id !== id),
        })),

      hasPermission: permission => {
        const { permissions } = get()
        return permissions.includes(permission)
      },

      reset: () => set(initialState),
    }),
    {
      name: 'tenant-storage',
      partialize: state => ({
        currentTenant: state.currentTenant,
      }),
    }
  )
)

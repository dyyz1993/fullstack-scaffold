import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type * as TenantTypes from '@shared/modules/tenant/schemas'
export type {
  Tenant,
  TenantRole,
  TenantMember,
  TenantInvitation,
  TenantWithStats,
} from '@shared/modules/tenant/schemas'

type Tenant = TenantTypes.Tenant
type TenantRole = TenantTypes.TenantRole
type TenantMember = TenantTypes.TenantMember
type TenantWithStats = TenantTypes.TenantWithStats

interface TenantState {
  tenants: TenantWithStats[]
  currentTenant: TenantWithStats | null
  roles: TenantRole[]
  members: TenantMember[]
  permissions: string[]
  isLoading: boolean
  error: string | null

  setTenants: (tenants: Tenant[]) => void
  setCurrentTenant: (tenant: TenantWithStats | null) => void
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
  tenants: [] as TenantWithStats[],
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

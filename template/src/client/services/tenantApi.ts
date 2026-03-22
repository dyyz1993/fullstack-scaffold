/**
 * @framework-baseline 5517d7521a8bb458
 * @framework-modify
 * @reason 租户管理 API 服务，提供类型安全的租户相关 API 调用
 * @impact 前端租户管理功能的核心 API 服务
 */

import type { Tenant, TenantRole, TenantMember, TenantInvitation } from '../stores/tenantStore'
import { apiClient } from './apiClient'

const TENANT_PERMISSIONS = {
  MEMBER_VIEW: 'tenant:member:view',
  MEMBER_INVITE: 'tenant:member:invite',
  MEMBER_REMOVE: 'tenant:member:remove',
  MEMBER_ROLE_ASSIGN: 'tenant:member:role:assign',
  ROLE_VIEW: 'tenant:role:view',
  ROLE_CREATE: 'tenant:role:create',
  ROLE_EDIT: 'tenant:role:edit',
  ROLE_DELETE: 'tenant:role:delete',
  SETTINGS_VIEW: 'tenant:settings:view',
  SETTINGS_EDIT: 'tenant:settings:edit',
  DATA_VIEW: 'tenant:data:view',
  DATA_CREATE: 'tenant:data:create',
  DATA_EDIT: 'tenant:data:edit',
  DATA_DELETE: 'tenant:data:delete',
  DATA_EXPORT: 'tenant:data:export',
  DATA_IMPORT: 'tenant:data:import',
  BILLING_VIEW: 'tenant:billing:view',
  BILLING_MANAGE: 'tenant:billing:manage',
  AUDIT_VIEW: 'tenant:audit:view',
} as const

interface TenantsResponse {
  tenants: Tenant[]
}

interface RolesResponse {
  roles: TenantRole[]
}

interface MembersResponse {
  members: TenantMember[]
}

class TenantApiService {
  async getTenants(): Promise<Tenant[]> {
    const response = await apiClient.api.tenants.$get()
    const result = await response.json()
    if (result.success) {
      return (result.data as TenantsResponse).tenants
    }
    throw new Error(result.error || 'Failed to get tenants')
  }

  async createTenant(input: {
    name: string
    slug: string
    plan?: 'free' | 'starter' | 'pro' | 'enterprise'
  }): Promise<Tenant> {
    const response = await apiClient.api.tenants.$post({
      json: input,
    })
    const result = await response.json()
    if (result.success) {
      return result.data as Tenant
    }
    throw new Error(result.error || 'Failed to create tenant')
  }

  async getTenant(tenantId: string): Promise<Tenant> {
    const response = await apiClient.api.tenants[':tenantId'].$get({
      param: { tenantId },
    })
    const result = await response.json()
    if (result.success) {
      return result.data as Tenant
    }
    throw new Error(result.error || 'Failed to get tenant')
  }

  async updateTenant(
    tenantId: string,
    input: {
      name?: string
      logo?: string
      description?: string
      settings?: string
    }
  ): Promise<Tenant> {
    const response = await apiClient.api.tenants[':tenantId'].$put({
      param: { tenantId },
      json: input,
    })
    const result = await response.json()
    if (result.success) {
      return result.data as Tenant
    }
    throw new Error(result.error || 'Failed to update tenant')
  }

  async deleteTenant(tenantId: string): Promise<void> {
    const response = await apiClient.api.tenants[':tenantId'].$delete({
      param: { tenantId },
    })
    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete tenant')
    }
  }

  async getRoles(tenantId: string): Promise<TenantRole[]> {
    const response = await apiClient.api.tenants[':tenantId'].roles.$get({
      param: { tenantId },
    })
    const result = await response.json()
    if (result.success) {
      return (result.data as RolesResponse).roles
    }
    throw new Error(result.error || 'Failed to get roles')
  }

  async createRole(
    tenantId: string,
    input: {
      code: string
      name: string
      label: string
      description?: string
      permissions: string[]
    }
  ): Promise<TenantRole> {
    const response = await apiClient.api.tenants[':tenantId'].roles.$post({
      param: { tenantId },
      json: input,
    })
    const result = await response.json()
    if (result.success) {
      return result.data as TenantRole
    }
    throw new Error(result.error || 'Failed to create role')
  }

  async updateRole(
    tenantId: string,
    roleId: string,
    input: {
      name?: string
      label?: string
      description?: string
      permissions?: string[]
    }
  ): Promise<TenantRole> {
    const response = await apiClient.api.tenants[':tenantId'].roles[':roleId'].$put({
      param: { tenantId, roleId },
      json: input,
    })
    const result = await response.json()
    if (result.success) {
      return result.data as TenantRole
    }
    throw new Error(result.error || 'Failed to update role')
  }

  async deleteRole(tenantId: string, roleId: string): Promise<void> {
    const response = await apiClient.api.tenants[':tenantId'].roles[':roleId'].$delete({
      param: { tenantId, roleId },
    })
    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete role')
    }
  }

  async getMembers(tenantId: string): Promise<TenantMember[]> {
    const response = await apiClient.api.tenants[':tenantId'].members.$get({
      param: { tenantId },
    })
    const result = await response.json()
    if (result.success) {
      return (result.data as MembersResponse).members
    }
    throw new Error(result.error || 'Failed to get members')
  }

  async inviteMember(
    tenantId: string,
    input: {
      email: string
      roleId: string
    }
  ): Promise<TenantInvitation> {
    const response = await apiClient.api.tenants[':tenantId'].members.invite.$post({
      param: { tenantId },
      json: input,
    })
    const result = await response.json()
    if (result.success) {
      return result.data as TenantInvitation
    }
    throw new Error(result.error || 'Failed to invite member')
  }

  async updateMember(
    tenantId: string,
    memberId: string,
    input: {
      roleId: string
    }
  ): Promise<TenantMember> {
    const response = await apiClient.api.tenants[':tenantId'].members[':memberId'].$put({
      param: { tenantId, memberId },
      json: input,
    })
    const result = await response.json()
    if (result.success) {
      return result.data as TenantMember
    }
    throw new Error(result.error || 'Failed to update member')
  }

  async removeMember(tenantId: string, memberId: string): Promise<void> {
    const response = await apiClient.api.tenants[':tenantId'].members[':memberId'].$delete({
      param: { tenantId, memberId },
    })
    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error || 'Failed to remove member')
    }
  }

  async getInvitation(token: string): Promise<TenantInvitation> {
    const response = await apiClient.api.tenants.invitations[':token'].$get({
      param: { token },
    })
    const result = await response.json()
    if (result.success) {
      return result.data as TenantInvitation
    }
    throw new Error(result.error || 'Failed to get invitation')
  }

  async acceptInvitation(token: string): Promise<TenantMember> {
    const response = await apiClient.api.tenants.invitations[':token'].accept.$post({
      param: { token },
    })
    const result = await response.json()
    if (result.success) {
      return result.data as TenantMember
    }
    throw new Error(result.error || 'Failed to accept invitation')
  }
}

export const tenantApi = new TenantApiService()
export { TENANT_PERMISSIONS }

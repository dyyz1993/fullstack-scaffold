import { useState, useEffect, useCallback } from 'react'
import { Building2, Users, Shield, Settings } from 'lucide-react'
import {
  useTenantStore,
  type TenantRole,
  type Tenant,
  type TenantMember,
  type TenantInvitation,
} from '../stores/tenantStore'
import { tenantApi } from '../services/tenantApi'
import { LoadingSpinner } from '../../client/components/LoadingSpinner'
import { EmptyState } from '../../client/components/EmptyState'
import { StatusBadge } from '../../client/components/StatusBadge'

export function TenantPage() {
  const {
    tenants,
    currentTenant,
    roles,
    members,
    setTenants,
    setCurrentTenant,
    setRoles,
    setMembers,
    isLoading,
    setLoading,
    error,
    setError,
  } = useTenantStore()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'members' | 'roles' | 'settings'>('members')

  const loadTenants = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await tenantApi.getTenants()
      setTenants(data)
      if (data.length > 0 && !currentTenant) {
        setCurrentTenant(data[0]!)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载租户失败')
    } finally {
      setLoading(false)
    }
  }, [currentTenant, setCurrentTenant, setError, setLoading, setTenants])

  const loadTenantData = useCallback(
    async (tenantId: string) => {
      setLoading(true)
      try {
        const [rolesData, membersData] = await Promise.all([
          tenantApi.getRoles(tenantId),
          tenantApi.getMembers(tenantId),
        ])
        setRoles(rolesData)
        setMembers(membersData)
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载租户数据失败')
      } finally {
        setLoading(false)
      }
    },
    [setError, setLoading, setRoles, setMembers]
  )

  useEffect(() => {
    loadTenants()
  }, [loadTenants])

  useEffect(() => {
    if (currentTenant?.id) {
      loadTenantData(currentTenant.id)
    }
  }, [currentTenant?.id, loadTenantData])

  if (isLoading && tenants.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg">
        <p>{error}</p>
        <button
          onClick={loadTenants}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          重试
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">租户管理</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          创建租户
        </button>
      </div>

      {tenants.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="暂无租户"
          description="创建您的第一个租户开始使用"
          action={
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              创建租户
            </button>
          }
        />
      ) : (
        <>
          <div className="flex gap-2 flex-wrap">
            {tenants.map((tenant: Tenant) => (
              <button
                key={tenant.id}
                onClick={() => setCurrentTenant(tenant)}
                className={`px-4 py-2 rounded-lg border ${
                  currentTenant?.id === tenant.id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-600'
                }`}
              >
                {tenant.name}
                <StatusBadge status={tenant.status} className="ml-2" />
              </button>
            ))}
          </div>

          {currentTenant && (
            <div className="bg-white rounded-lg shadow">
              <div className="border-b">
                <div className="flex">
                  {[
                    { key: 'members', label: '成员管理', icon: Users },
                    { key: 'roles', label: '角色管理', icon: Shield },
                    { key: 'settings', label: '设置', icon: Settings },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as typeof activeTab)}
                      className={`flex items-center gap-2 px-6 py-3 font-medium ${
                        activeTab === tab.key
                          ? 'border-b-2 border-blue-600 text-blue-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6">
                {activeTab === 'members' && (
                  <MembersTab
                    members={members}
                    roles={roles}
                    onInvite={() => setShowInviteModal(true)}
                  />
                )}
                {activeTab === 'roles' && <RolesTab roles={roles} />}
                {activeTab === 'settings' && <SettingsTab tenant={currentTenant} />}
              </div>
            </div>
          )}
        </>
      )}

      {showCreateModal && <CreateTenantModal onClose={() => setShowCreateModal(false)} />}

      {showInviteModal && currentTenant && (
        <InviteMemberModal
          tenantId={currentTenant.id}
          roles={roles}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  )
}

function MembersTab({
  members,
  roles,
  onInvite,
}: {
  members: TenantMember[]
  roles: TenantRole[]
  onInvite: () => void
}) {
  const getRoleLabel = (roleId: string): string => {
    const role = roles.find((r: TenantRole) => r.id === roleId)
    return role?.label || roleId
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">成员列表</h2>
        <button
          onClick={onInvite}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          邀请成员
        </button>
      </div>

      {members.length === 0 ? (
        <EmptyState icon={Users} title="暂无成员" description="邀请成员加入租户" />
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4">用户 ID</th>
              <th className="text-left py-3 px-4">角色</th>
              <th className="text-left py-3 px-4">状态</th>
              <th className="text-left py-3 px-4">加入时间</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member: TenantMember) => (
              <tr key={member.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4">{member.userId}</td>
                <td className="py-3 px-4">{getRoleLabel(member.roleId)}</td>
                <td className="py-3 px-4">
                  <StatusBadge status={member.status} />
                </td>
                <td className="py-3 px-4">
                  {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function RolesTab({ roles }: { roles: TenantRole[] }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">角色列表</h2>
      </div>

      {roles.length === 0 ? (
        <EmptyState icon={Shield} title="暂无角色" description="系统会自动创建默认角色" />
      ) : (
        <div className="grid gap-4">
          {roles.map((role: TenantRole) => (
            <div key={role.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{role.label}</h3>
                  <p className="text-sm text-gray-500">{role.description || role.code}</p>
                </div>
                {role.isSystem && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                    系统角色
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {JSON.parse(role.permissions)
                  .slice(0, 5)
                  .map((p: string) => (
                    <span key={p} className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded">
                      {p}
                    </span>
                  ))}
                {JSON.parse(role.permissions).length > 5 && (
                  <span className="px-2 py-1 bg-gray-50 text-gray-600 text-xs rounded">
                    +{JSON.parse(role.permissions).length - 5} 更多
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SettingsTab({ tenant }: { tenant: Tenant }) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">租户设置</h2>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">租户名称</label>
            <input
              type="text"
              value={tenant.name}
              readOnly
              className="mt-1 block w-full px-3 py-2 border rounded-lg bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">租户标识</label>
            <input
              type="text"
              value={tenant.slug}
              readOnly
              className="mt-1 block w-full px-3 py-2 border rounded-lg bg-gray-50"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">套餐</label>
            <input
              type="text"
              value={tenant.plan}
              readOnly
              className="mt-1 block w-full px-3 py-2 border rounded-lg bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">状态</label>
            <div className="mt-2">
              <StatusBadge status={tenant.status} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">成员上限</label>
            <input
              type="text"
              value={tenant.maxMembers ?? '无限制'}
              readOnly
              className="mt-1 block w-full px-3 py-2 border rounded-lg bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">存储上限</label>
            <input
              type="text"
              value={
                tenant.maxStorage
                  ? `${(tenant.maxStorage / 1024 / 1024 / 1024).toFixed(2)} GB`
                  : '无限制'
              }
              readOnly
              className="mt-1 block w-full px-3 py-2 border rounded-lg bg-gray-50"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function CreateTenantModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [plan, setPlan] = useState<'free' | 'starter' | 'pro' | 'enterprise'>('free')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { addTenant, setCurrentTenant } = useTenantStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const tenant = await tenantApi.createTenant({ name, slug, plan })
      addTenant(tenant)
      setCurrentTenant(tenant)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">创建租户</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">租户名称</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border rounded-lg"
                placeholder="我的公司"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">租户标识</label>
              <input
                type="text"
                value={slug}
                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                required
                pattern="[a-z0-9-]+"
                className="mt-1 block w-full px-3 py-2 border rounded-lg"
                placeholder="my-company"
              />
              <p className="text-xs text-gray-500 mt-1">只能包含小写字母、数字和连字符</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">套餐</label>
              <select
                value={plan}
                onChange={e => setPlan(e.target.value as typeof plan)}
                className="mt-1 block w-full px-3 py-2 border rounded-lg"
              >
                <option value="free">免费版</option>
                <option value="starter">入门版</option>
                <option value="pro">专业版</option>
                <option value="enterprise">企业版</option>
              </select>
            </div>
          </div>

          {error && <p className="text-red-600 text-sm mt-4">{error}</p>}

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '创建中...' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function InviteMemberModal({
  tenantId,
  roles,
  onClose,
}: {
  tenantId: string
  roles: TenantRole[]
  onClose: () => void
}) {
  const [email, setEmail] = useState('')
  const defaultRoleId = roles.find((r: TenantRole) => !r.isSystem)?.id || roles[0]?.id || ''
  const [roleId, setRoleId] = useState<string>(defaultRoleId)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invitationLink, setInvitationLink] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const invitation: TenantInvitation = await tenantApi.inviteMember(tenantId, {
        email,
        roleId,
      })
      setInvitationLink(`${window.location.origin}/invite/${invitation.token}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '邀请失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = () => {
    if (invitationLink) {
      navigator.clipboard.writeText(invitationLink)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">邀请成员</h2>

        {invitationLink ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">邀请链接已生成，请复制并发送给被邀请人：</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={invitationLink}
                readOnly
                className="flex-1 px-3 py-2 border rounded-lg bg-gray-50 text-sm"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                复制
              </button>
            </div>
            <p className="text-xs text-gray-500">链接有效期：7 天</p>
            <div className="flex justify-end">
              <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                关闭
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">邮箱</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border rounded-lg"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">角色</label>
                <select
                  value={roleId}
                  onChange={e => setRoleId(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border rounded-lg"
                >
                  {roles.map((role: TenantRole) => (
                    <option key={role.id} value={role.id}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && <p className="text-red-600 text-sm mt-4">{error}</p>}

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '发送中...' : '发送邀请'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

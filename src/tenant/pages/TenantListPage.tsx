import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Plus, Users, Settings, MoreHorizontal, Trash2 } from 'lucide-react'
import { Card, Button, Tag, Empty, Spin, Dropdown, Modal, message } from 'antd'
import type { MenuProps } from 'antd'
import { useTenantStore, type Tenant } from '../stores/tenantStore'
import { tenantApi } from '../services/tenantApi'

const planColors: Record<string, string> = {
  free: 'blue',
  starter: 'green',
  pro: 'gold',
  enterprise: 'purple',
}

const planLabels: Record<string, string> = {
  free: '免费版',
  starter: '入门版',
  pro: '专业版',
  enterprise: '企业版',
}

export const TenantListPage: React.FC = () => {
  const navigate = useNavigate()
  const { tenants, setTenants, setCurrentTenant } = useTenantStore()
  const [loading, setLoading] = useState(false)

  const loadTenants = useCallback(async () => {
    setLoading(true)
    try {
      const data = await tenantApi.getTenants()
      setTenants(data)
    } catch {
      message.error('加载租户失败')
    } finally {
      setLoading(false)
    }
  }, [setTenants])

  useEffect(() => {
    loadTenants()
  }, [loadTenants])

  const handleSelectTenant = (tenant: Tenant) => {
    setCurrentTenant(tenant)
    navigate(`/tenants/${tenant.id}/members`)
  }

  const handleDeleteTenant = (tenant: Tenant) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除租户「${tenant.name}」吗？此操作不可恢复。`,
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await tenantApi.deleteTenant(tenant.id)
          message.success('租户已删除')
          loadTenants()
        } catch {
          message.error('删除失败')
        }
      },
    })
  }

  const handleCreateTenant = () => {
    navigate('/tenants/new')
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">我的工作空间</h1>
          <p className="text-gray-500 mt-1">选择一个租户进行管理，或创建新的租户</p>
        </div>
        <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={handleCreateTenant}>
          创建租户
        </Button>
      </div>

      {tenants.length === 0 ? (
        <Card>
          <Empty
            image={<Building2 className="w-16 h-16 text-gray-300 mx-auto" />}
            description={
              <div className="text-center">
                <p className="text-gray-500 mb-4">您还没有加入任何租户</p>
                <Button
                  type="primary"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={handleCreateTenant}
                >
                  创建第一个租户
                </Button>
              </div>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tenants.map(tenant => {
            const items: MenuProps['items'] = [
              {
                key: 'settings',
                icon: <Settings className="w-4 h-4" />,
                label: '设置',
                onClick: () => {
                  setCurrentTenant(tenant)
                  navigate(`/tenants/${tenant.id}/settings`)
                },
              },
              { type: 'divider' },
              {
                key: 'delete',
                icon: <Trash2 className="w-4 h-4" />,
                label: '删除',
                danger: true,
                onClick: () => handleDeleteTenant(tenant),
              },
            ]

            return (
              <Card
                key={tenant.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleSelectTenant(tenant)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-lg font-bold">
                      {tenant.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{tenant.name}</div>
                      <div className="text-sm text-gray-500">{tenant.slug}</div>
                    </div>
                  </div>
                  <div onClick={e => e.stopPropagation()}>
                    <Dropdown menu={{ items }} trigger={['click']}>
                      <Button type="text" icon={<MoreHorizontal className="w-4 h-4" />} />
                    </Dropdown>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-4">
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Users className="w-4 h-4" />
                    <span>{tenant.memberCount || 0} 成员</span>
                  </div>
                  <Tag color={planColors[tenant.plan] || 'blue'}>
                    {planLabels[tenant.plan] || tenant.plan}
                  </Tag>
                  <Tag color={tenant.status === 'active' ? 'green' : 'default'}>
                    {tenant.status === 'active' ? '活跃' : tenant.status}
                  </Tag>
                </div>
              </Card>
            )
          })}

          <Card
            className="border-dashed hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer flex items-center justify-center min-h-[140px]"
            onClick={handleCreateTenant}
          >
            <div className="text-center">
              <Plus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <span className="text-gray-500">创建新租户</span>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

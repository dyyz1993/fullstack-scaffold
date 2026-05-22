import { Card, Table, Tag } from 'antd'
import { usePermissions } from '../hooks/usePermissions'
import { usePermissionCategories, useRoleLabels, usePermissionLabels } from '../hooks/useConfig'
import type { PermissionInfo, Permission } from '@shared/modules/permission'
import { useLanguage } from '../i18n/useLanguage'

export const PermissionsPage: React.FC = () => {
  const { t } = useLanguage()
  const { allPermissions, roles, loading } = usePermissions()
  const { categories } = usePermissionCategories()
  const { roleLabels } = useRoleLabels()
  const { permissionLabels } = usePermissionLabels()

  const groupedPermissions = allPermissions.reduce((acc, permission) => {
    const category = permission.category
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(permission)
    return acc
  }, {} as Record<string, PermissionInfo[]>)

  const columns = [
    {
      title: t('permissions.permission'),
      dataIndex: 'permission',
      key: 'permission',
      render: (permission: Permission) => permissionLabels[permission] || permission,
    },
    {
      title: t('permissions.superAdmin'),
      key: 'superAdmin',
      render: (_: unknown, record: PermissionInfo) => {
        const role = roles.find(r => r.role === 'super_admin')
        const hasPermission = role?.permissions.includes(record.permission)
        return hasPermission ? <Tag color="green">✓</Tag> : <Tag color="red">✗</Tag>
      },
    },
    {
      title: t('permissions.customerService'),
      key: 'customerService',
      render: (_: unknown, record: PermissionInfo) => {
        const role = roles.find(r => r.role === 'customer_service')
        const hasPermission = role?.permissions.includes(record.permission)
        return hasPermission ? <Tag color="green">✓</Tag> : <Tag color="red">✗</Tag>
      },
    },
    {
      title: t('permissions.normalUser'),
      key: 'user',
      render: (_: unknown, record: PermissionInfo) => {
        const role = roles.find(r => r.role === 'user')
        const hasPermission = role?.permissions.includes(record.permission)
        return hasPermission ? <Tag color="green">✓</Tag> : <Tag color="red">✗</Tag>
      },
    },
  ]

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">{t('permissions.title')}</h1>

      <Card title={t('permissions.roleList')} className="mb-6">
        <div className="grid grid-cols-3 gap-4">
          {roles.map(role => (
            <Card key={role.role} size="small">
              <div className="text-lg font-semibold mb-2">{roleLabels[role.role] || role.role}</div>
              <div className="text-sm text-gray-500">
                {t('permissions.permissionCount', { count: role.permissions.length })}
              </div>
            </Card>
          ))}
        </div>
      </Card>

      <Card title={t('permissions.permissionMatrix')}>
        {Object.entries(groupedPermissions).map(([category, permissions]) => (
          <div key={category} className="mb-6">
            <h3 className="text-lg font-semibold mb-3">
              {categories[category]?.label || category}
            </h3>
            <Table
              columns={columns}
              dataSource={permissions}
              rowKey="permission"
              pagination={false}
              loading={loading}
              size="small"
            />
          </div>
        ))}
      </Card>
    </div>
  )
}

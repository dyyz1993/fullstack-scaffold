import { Table, Card, Tag, Collapse, Descriptions, Badge, Alert } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { usePermissions } from '../hooks/usePermissions'
import { PermissionGuard } from '../components/PermissionGuard'
import {
  Permission,
  Role,
  PERMISSION_CATEGORIES,
  ROLE_LABELS,
  PERMISSION_LABELS,
} from '@shared/modules/admin'
import type { PermissionInfo } from '@shared/modules/admin'

const { Panel } = Collapse

export const PermissionsPage: React.FC = () => {
  const { roles, allPermissions, role } = usePermissions()

  const getPermissionLabel = (permission: string) => {
    return PERMISSION_LABELS[permission as Permission] || permission
  }

  const getRoleLabel = (role: Role) => {
    return ROLE_LABELS[role] || role
  }

  const roleColumns = [
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: Role) => (
        <Tag
          color={
            role === Role.SUPER_ADMIN ? 'red' : role === Role.CUSTOMER_SERVICE ? 'blue' : 'green'
          }
        >
          {getRoleLabel(role)}
        </Tag>
      ),
    },
    {
      title: '权限数量',
      dataIndex: 'permissions',
      key: 'permissionCount',
      render: (permissions: string[]) => permissions.length,
    },
    {
      title: '权限列表',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (permissions: string[]) => (
        <div className="flex flex-wrap gap-1">
          {permissions.slice(0, 5).map(p => (
            <Tag key={p} color="default">
              {getPermissionLabel(p)}
            </Tag>
          ))}
          {permissions.length > 5 && <Tag color="default">+{permissions.length - 5} 更多</Tag>}
        </div>
      ),
    },
  ]

  const permissionColumns = [
    {
      title: '权限',
      dataIndex: 'permission',
      key: 'permission',
      render: (permission: string) => <code className="text-sm">{permission}</code>,
    },
    {
      title: '说明',
      dataIndex: 'label',
      key: 'label',
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => <Tag color="blue">{category}</Tag>,
    },
    {
      title: '超级管理员',
      key: 'superAdmin',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render: (_: any, record: PermissionInfo) =>
        roles
          .find(r => r.role === Role.SUPER_ADMIN)
          ?.permissions.includes(record.permission as Permission) ? (
          <CheckCircleOutlined className="text-green-500" />
        ) : (
          <CloseCircleOutlined className="text-red-500" />
        ),
    },
    {
      title: '客服人员',
      key: 'customerService',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render: (_: any, record: PermissionInfo) =>
        roles
          .find(r => r.role === Role.CUSTOMER_SERVICE)
          ?.permissions.includes(record.permission as Permission) ? (
          <CheckCircleOutlined className="text-green-500" />
        ) : (
          <CloseCircleOutlined className="text-red-500" />
        ),
    },
    {
      title: '普通用户',
      key: 'user',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render: (_: any, record: PermissionInfo) =>
        roles
          .find(r => r.role === Role.USER)
          ?.permissions.includes(record.permission as Permission) ? (
          <CheckCircleOutlined className="text-green-500" />
        ) : (
          <CloseCircleOutlined className="text-red-500" />
        ),
    },
  ]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">权限管理</h1>
        <p className="text-gray-600 mt-2">查看系统角色和权限配置</p>
      </div>

      <PermissionGuard permission={Permission.SYSTEM_SETTINGS}>
        <Alert
          message="权限说明"
          description="超级管理员拥有所有权限。客服人员拥有订单处理、工单管理等客服相关权限。普通用户只能查看基本内容。"
          type="info"
          showIcon
          className="mb-6"
        />
      </PermissionGuard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {roles.map(roleInfo => (
          <Card
            key={roleInfo.role}
            title={getRoleLabel(roleInfo.role as Role)}
            className="shadow-sm"
          >
            <Descriptions column={1} size="small">
              <Descriptions.Item label="角色标识">
                <code>{roleInfo.role}</code>
              </Descriptions.Item>
              <Descriptions.Item label="权限数量">
                <Badge count={roleInfo.permissions.length} showZero color="blue" />
              </Descriptions.Item>
            </Descriptions>
          </Card>
        ))}
      </div>

      <Card title="角色权限详情" className="mb-6 shadow-sm">
        <Table
          dataSource={roles}
          columns={roleColumns}
          rowKey="role"
          pagination={false}
          expandable={{
            expandedRowRender: record => (
              <div className="p-4">
                <h4 className="font-semibold mb-2">权限列表：</h4>
                <div className="flex flex-wrap gap-2">
                  {record.permissions.map(p => (
                    <Tag key={p} color="blue">
                      {getPermissionLabel(p)}
                    </Tag>
                  ))}
                </div>
              </div>
            ),
          }}
        />
      </Card>

      <Card title="权限分类" className="shadow-sm">
        <Collapse accordion>
          {Object.entries(PERMISSION_CATEGORIES).map(([key, category]) => (
            <Panel header={category.label} key={key}>
              <Table
                dataSource={allPermissions.filter(p => p.category === category.label)}
                columns={permissionColumns}
                rowKey="permission"
                pagination={false}
                size="small"
              />
            </Panel>
          ))}
        </Collapse>
      </Card>

      {role && (
        <Card title="我的权限" className="mt-6 shadow-sm">
          <Descriptions column={1}>
            <Descriptions.Item label="当前角色">
              <Tag
                color={
                  role === Role.SUPER_ADMIN
                    ? 'red'
                    : role === Role.CUSTOMER_SERVICE
                      ? 'blue'
                      : 'green'
                }
              >
                {getRoleLabel(role)}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}
    </div>
  )
}

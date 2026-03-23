import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Shield, Plus, Edit, Trash2, MoreHorizontal } from 'lucide-react'
import { Button, Card, Tag, Modal, Form, Input, Select, message, Empty, Spin, Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import { useTenantStore, type TenantRole } from '../stores/tenantStore'
import { tenantApi } from '../services/tenantApi'
import {
  TenantPermission,
  TENANT_PERMISSION_LABELS,
  TENANT_PERMISSION_CATEGORIES,
} from '@platform/shared/permission/tenant-permissions'

export const RolesPage: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>()
  const { roles, setRoles } = useTenantStore()
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<TenantRole | null>(null)
  const [form] = Form.useForm()

  const loadRoles = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    try {
      const data = await tenantApi.getRoles(tenantId)
      setRoles(data)
    } catch {
      message.error('加载角色失败')
    } finally {
      setLoading(false)
    }
  }, [tenantId, setRoles])

  useEffect(() => {
    loadRoles()
  }, [loadRoles])

  const handleCreate = () => {
    setEditingRole(null)
    form.resetFields()
    setModalOpen(true)
  }

  const handleEdit = (role: TenantRole) => {
    setEditingRole(role)
    form.setFieldsValue({
      name: role.name,
      label: role.label,
      description: role.description,
      permissions: JSON.parse(role.permissions),
    })
    setModalOpen(true)
  }

  const handleDelete = (role: TenantRole) => {
    if (role.isSystem) {
      message.warning('系统角色无法删除')
      return
    }

    Modal.confirm({
      title: '确认删除',
      content: `确定要删除角色「${role.label}」吗？`,
      okText: '确认',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        if (!tenantId) return
        try {
          await tenantApi.deleteRole(tenantId, role.id)
          message.success('角色已删除')
          loadRoles()
        } catch {
          message.error('删除失败')
        }
      },
    })
  }

  const handleSubmit = async (values: {
    name: string
    label: string
    description?: string
    permissions: string[]
  }) => {
    if (!tenantId) return
    try {
      if (editingRole) {
        await tenantApi.updateRole(tenantId, editingRole.id, values)
        message.success('角色已更新')
      } else {
        await tenantApi.createRole(tenantId, {
          code: values.name.toLowerCase().replace(/\s+/g, '_'),
          ...values,
        })
        message.success('角色已创建')
      }
      setModalOpen(false)
      loadRoles()
    } catch {
      message.error(editingRole ? '更新失败' : '创建失败')
    }
  }

  const getPermissionLabel = (permission: string) => {
    return TENANT_PERMISSION_LABELS[permission as TenantPermission] || permission
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">角色管理</h1>
          <p className="text-gray-500 mt-1">管理租户内的角色和权限配置</p>
        </div>
        <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={handleCreate}>
          创建角色
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spin size="large" />
        </div>
      ) : roles.length === 0 ? (
        <Empty description="暂无角色" className="py-12" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roles.map(role => {
            const permissions = JSON.parse(role.permissions) as string[]

            const items: MenuProps['items'] = [
              {
                key: 'edit',
                icon: <Edit className="w-4 h-4" />,
                label: '编辑',
                onClick: () => handleEdit(role),
              },
            ]

            if (!role.isSystem) {
              items.push({
                key: 'delete',
                icon: <Trash2 className="w-4 h-4" />,
                label: '删除',
                danger: true,
                onClick: () => handleDelete(role),
              })
            }

            return (
              <Card
                key={role.id}
                className="hover:shadow-md transition-shadow"
                title={
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-500" />
                    <span>{role.label}</span>
                    {role.isSystem && <Tag color="blue">系统</Tag>}
                  </div>
                }
                extra={
                  <Dropdown menu={{ items }} trigger={['click']}>
                    <Button type="text" icon={<MoreHorizontal className="w-4 h-4" />} />
                  </Dropdown>
                }
              >
                <p className="text-gray-500 text-sm mb-4">{role.description || role.code}</p>
                <div className="space-y-2">
                  <div className="text-xs text-gray-400">权限 ({permissions.length})</div>
                  <div className="flex flex-wrap gap-1">
                    {permissions.slice(0, 5).map(p => (
                      <Tag key={p} className="text-xs">
                        {getPermissionLabel(p)}
                      </Tag>
                    ))}
                    {permissions.length > 5 && (
                      <Tag className="text-xs">+{permissions.length - 5} 更多</Tag>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        title={editingRole ? '编辑角色' : '创建角色'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="角色名称" rules={[{ required: true }]}>
            <Input placeholder="role_name" disabled={!!editingRole} />
          </Form.Item>
          <Form.Item name="label" label="显示名称" rules={[{ required: true }]}>
            <Input placeholder="角色显示名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="角色描述" rows={2} />
          </Form.Item>
          <Form.Item name="permissions" label="权限" rules={[{ required: true }]}>
            <Select mode="multiple" placeholder="选择权限" optionLabelProp="label">
              {Object.entries(TENANT_PERMISSION_CATEGORIES).map(([category, config]) => (
                <Select.OptGroup key={category} label={config.label}>
                  {config.permissions.map(permission => (
                    <Select.Option
                      key={permission}
                      value={permission}
                      label={TENANT_PERMISSION_LABELS[permission]}
                    >
                      {TENANT_PERMISSION_LABELS[permission]}
                    </Select.Option>
                  ))}
                </Select.OptGroup>
              ))}
            </Select>
          </Form.Item>
          <Form.Item className="mb-0 text-right">
            <Button className="mr-2" onClick={() => setModalOpen(false)}>
              取消
            </Button>
            <Button type="primary" htmlType="submit">
              {editingRole ? '更新' : '创建'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

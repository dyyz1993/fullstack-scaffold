import React, { useEffect, useState } from 'react'
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Switch,
  message,
  Popconfirm,
  Space,
  Tag,
  Tabs,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  KeyOutlined,
  CodeOutlined,
  ApartmentOutlined,
} from '@ant-design/icons'
import { useRoleStore } from '../hooks/useRoles'
import { useConfig, usePermissionCategories } from '../hooks/useConfig'
import { usePermissions } from '../hooks/usePermissions'
import type { RoleDataType, CreateRoleType } from '@shared/modules/role/schemas'
import { PermissionConfigEditor } from '../components/PermissionConfigEditor'
import { PermissionTree } from '../components/PermissionTree'
import { apiClient } from '../services/apiClient'
import { validatePermissionDependencies } from '@shared/modules/permission/permission-dependencies'
import { useLanguage } from '../i18n/useLanguage'

type RoleFormValues = Pick<CreateRoleType, 'code' | 'name' | 'label' | 'description'> & {
  isActive?: boolean | null
}

export const RolesPage: React.FC = () => {
  const { t } = useLanguage()
  const { roles, loading, fetchRoles, createRole, updateRole, deleteRole, updateRolePermissions } =
    useRoleStore()
  const { permissions } = useConfig()
  const { categories } = usePermissionCategories()
  const { refreshPermissions } = usePermissions()
  const [modalVisible, setModalVisible] = useState(false)
  const [permissionModalVisible, setPermissionModalVisible] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleDataType | null>(null)
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [form] = Form.useForm<RoleFormValues>()

  useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  const handleCreate = () => {
    setEditingRole(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (role: RoleDataType) => {
    setEditingRole(role)
    form.setFieldsValue({
      code: role.code,
      name: role.name,
      label: role.label,
      description: role.description,
      isActive: role.isActive ?? undefined,
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    const success = await deleteRole(id)
    if (success) {
      message.success(t('roles.deleted'))
    }
  }

  const handleManagePermissions = async (role: RoleDataType) => {
    setEditingRole(role)

    try {
      const response = await apiClient.api.roles[':id'].$get({
        param: { id: role.id },
      })
      const data = await response.json()

      if (data.success && data.data.permissions) {
        setSelectedPermissions(data.data.permissions)
      } else {
        setSelectedPermissions([])
      }
    } catch (error) {
      console.error('Failed to fetch role permissions:', error)
      setSelectedPermissions([])
    }

    setPermissionModalVisible(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      if (editingRole) {
        const success = await updateRole(editingRole.id, values)
        if (success) {
          message.success(t('roles.updated'))
          setModalVisible(false)
        }
      } else {
        const success = await createRole(values)
        if (success) {
          message.success(t('roles.created'))
          setModalVisible(false)
        }
      }
    } catch (error) {
      console.error('Form validation failed:', error)
    }
  }

  const handlePermissionSubmit = async () => {
    if (!editingRole) return

    const validation = validatePermissionDependencies(selectedPermissions)
    if (!validation.valid) {
      Modal.error({
        title: t('roles.permissionValidationFailed'),
        content: (
          <div>
            <p>{t('roles.permissionValidationErrors')}</p>
            <ul>
              {validation.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        ),
      })
      return
    }

    const success = await updateRolePermissions(editingRole.id, selectedPermissions)
    if (success) {
      message.success(t('roles.permissionUpdated'))
      setPermissionModalVisible(false)
      await refreshPermissions()
    }
  }

  const columns = [
    {
      title: t('roles.roleCode'),
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: t('roles.roleName'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('roles.displayName'),
      dataIndex: 'label',
      key: 'label',
    },
    {
      title: t('roles.description'),
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: t('roles.isSystem'),
      dataIndex: 'isSystem',
      key: 'isSystem',
      render: (isSystem: boolean) => (
        <Tag color={isSystem ? 'blue' : 'default'}>
          {isSystem ? t('common.yes') : t('common.no')}
        </Tag>
      ),
    },
    {
      title: t('common.status'),
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? t('common.enabled') : t('common.disabled')}
        </Tag>
      ),
    },
    {
      title: t('common.actions'),
      key: 'action',
      render: (_: unknown, record: RoleDataType) => (
        <Space>
          {record.code !== 'super_admin' && (
            <Button
              type="link"
              icon={<KeyOutlined />}
              onClick={() => handleManagePermissions(record)}
            >
              {t('roles.permissions')}
            </Button>
          )}
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            {t('common.edit')}
          </Button>
          {!record.isSystem && (
            <Popconfirm
              title={t('roles.deleteConfirm')}
              onConfirm={() => handleDelete(record.id)}
              okText={t('common.confirm')}
              cancelText={t('common.cancel')}
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                {t('common.delete')}
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <h1>{t('roles.title')}</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          {t('roles.createRole')}
        </Button>
      </div>

      <Table columns={columns} dataSource={roles} rowKey="id" loading={loading} />

      <Modal
        title={editingRole ? t('roles.editRole') : t('roles.createRole')}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText={t('common.confirm')}
        cancelText={t('common.cancel')}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="code"
            label={t('roles.roleCode')}
            rules={[{ required: true, message: t('roles.roleCodeRequired') }]}
          >
            <Input disabled={!!editingRole} placeholder={t('roles.roleCodePlaceholder')} />
          </Form.Item>

          <Form.Item
            name="name"
            label={t('roles.roleName')}
            rules={[{ required: true, message: t('roles.roleNameRequired') }]}
          >
            <Input placeholder={t('roles.roleNamePlaceholder')} />
          </Form.Item>

          <Form.Item
            name="label"
            label={t('roles.displayName')}
            rules={[{ required: true, message: t('roles.displayNameRequired') }]}
          >
            <Input placeholder={t('roles.displayNamePlaceholder')} />
          </Form.Item>

          <Form.Item name="description" label={t('roles.description')}>
            <Input.TextArea placeholder={t('roles.descriptionPlaceholder')} />
          </Form.Item>

          {editingRole && (
            <Form.Item name="isActive" label={t('common.status')} valuePropName="checked">
              <Switch
                checkedChildren={t('common.enabled')}
                unCheckedChildren={t('common.disabled')}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title={t('roles.managePermissions', { name: editingRole?.label || '' })}
        open={permissionModalVisible}
        onOk={handlePermissionSubmit}
        onCancel={() => setPermissionModalVisible(false)}
        width={900}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
      >
        <Tabs
          defaultActiveKey="tree"
          items={[
            {
              key: 'tree',
              label: (
                <span>
                  <ApartmentOutlined />
                  {t('roles.treeView')}
                </span>
              ),
              children: (
                <PermissionTree
                  permissions={permissions}
                  categories={categories}
                  selectedPermissions={selectedPermissions}
                  onSelectionChange={setSelectedPermissions}
                />
              ),
            },
            {
              key: 'json',
              label: (
                <span>
                  <CodeOutlined />
                  {t('roles.jsonView')}
                </span>
              ),
              children: (
                <PermissionConfigEditor
                  visible={true}
                  title=""
                  permissions={permissions}
                  selectedPermissions={selectedPermissions}
                  onCancel={() => {}}
                  onOk={setSelectedPermissions}
                />
              ),
            },
          ]}
        />
      </Modal>
    </div>
  )
}

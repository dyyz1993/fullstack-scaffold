import { useState, useEffect, useCallback } from 'react'
import {
  Table,
  Card,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  Space,
  message,
  Popconfirm,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  LockOutlined,
  UnlockOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { apiClient, api } from '../services/apiClient'
import { useRoleLabels } from '../hooks/useConfig'
import { Permission, Role } from '@shared/modules/permission'
import { PermissionGuard } from '../components/PermissionGuard'
import type { User, CreateUserRequest } from '@shared/modules/admin'
import { useLanguage } from '../i18n/useLanguage'

type UserFormData = CreateUserRequest & { password?: string }

export const UsersPage: React.FC = () => {
  const { t, formatDate } = useLanguage()
  const [users, setUsers] = useState<User[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [form] = Form.useForm<UserFormData>()
  const { roleLabels } = useRoleLabels()

  const fetchUsers = useCallback(async () => {
    try {
      const data = await api(apiClient.api.admin.users.$get())
        .withLoading(t('users.loading'))
        .json()
      setUsers(data)
    } catch {
      // handled by api-request
    }
  }, [t])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleCreate = () => {
    setEditingUser(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    form.setFieldsValue({
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
    })
    setModalVisible(true)
  }

  const handleSubmit = async (values: UserFormData) => {
    try {
      if (editingUser) {
        await api(
          apiClient.api.admin.users[':id'].$put({
            param: { id: editingUser.id },
            json: values,
          })
        )
          .withLoading(t('users.updating'))
          .json()
        message.success(t('users.updated'))
        setModalVisible(false)
        fetchUsers()
      } else {
        await api(
          apiClient.api.admin.users.$post({
            json: {
              username: values.username,
              email: values.email,
              password: values.password!,
              role: values.role,
              status: values.status,
            },
          })
        )
          .withLoading(t('users.creating'))
          .json()
        message.success(t('users.created'))
        setModalVisible(false)
        fetchUsers()
      }
    } catch {
      // handled by api-request
    }
  }

  const handleToggleLock = async (user: User) => {
    try {
      const newStatus = user.status === 'locked' ? 'active' : 'locked'
      await api(
        apiClient.api.admin.users[':id'].$put({
          param: { id: user.id },
          json: { status: newStatus },
        })
      )
        .withLoading()
        .json()
      message.success(newStatus === 'locked' ? t('users.userLocked') : t('users.userUnlocked'))
      fetchUsers()
    } catch {
      // handled by api-request
    }
  }

  const handleDelete = async (userId: string) => {
    try {
      await api(
        apiClient.api.admin.users[':id'].$delete({
          param: { id: userId },
        })
      )
        .withLoading(t('users.deleting'))
        .json()
      message.success(t('users.deleted'))
      fetchUsers()
    } catch {
      // handled by api-request
    }
  }

  const getStatusTag = (status: string) => {
    const statusConfig: Record<string, { color: string; textKey: string }> = {
      active: { color: 'green', textKey: 'users.active' },
      inactive: { color: 'orange', textKey: 'users.inactive' },
      locked: { color: 'red', textKey: 'users.locked' },
    }
    const config = statusConfig[status]
    if (!config) return <Tag>{status}</Tag>
    return <Tag color={config.color}>{t(config.textKey)}</Tag>
  }

  const columns: ColumnsType<User> = [
    {
      title: t('users.username'),
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: t('users.email'),
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: t('users.role'),
      dataIndex: 'role',
      key: 'role',
      render: (role: Role) => <Tag color="blue">{roleLabels[role] || role}</Tag>,
    },
    {
      title: t('users.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: t('common.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => formatDate(date),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      render: (_: unknown, record: User) => (
        <Space>
          <PermissionGuard permission={Permission.USER_EDIT}>
            <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
              {t('common.edit')}
            </Button>
          </PermissionGuard>
          <PermissionGuard permission={Permission.USER_EDIT}>
            <Button
              type="link"
              icon={record.status === 'locked' ? <UnlockOutlined /> : <LockOutlined />}
              onClick={() => handleToggleLock(record)}
              danger={record.status !== 'locked'}
            >
              {record.status === 'locked' ? t('users.unlock') : t('users.lock')}
            </Button>
          </PermissionGuard>
          <PermissionGuard permission={Permission.USER_DELETE}>
            <Popconfirm
              title={t('users.deleteConfirm')}
              onConfirm={() => handleDelete(record.id)}
              okText={t('common.confirm')}
              cancelText={t('common.cancel')}
            >
              <Button type="link" icon={<DeleteOutlined />} danger>
                {t('common.delete')}
              </Button>
            </Popconfirm>
          </PermissionGuard>
        </Space>
      ),
    },
  ]

  return (
    <div className="p-6">
      <Card
        title={t('users.title')}
        extra={
          <PermissionGuard permission={Permission.USER_CREATE}>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              {t('users.createUser')}
            </Button>
          </PermissionGuard>
        }
      >
        <Table columns={columns} dataSource={users} rowKey="id" />
      </Card>

      <Modal
        title={editingUser ? t('users.editUser') : t('users.createUser')}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="username"
            label={t('users.username')}
            rules={[{ required: true, message: t('users.usernameRequired') }]}
          >
            <Input placeholder={t('users.usernamePlaceholder')} />
          </Form.Item>
          <Form.Item
            name="email"
            label={t('users.email')}
            rules={[
              { required: true, message: t('users.emailRequired') },
              { type: 'email', message: t('users.emailInvalid') },
            ]}
          >
            <Input placeholder={t('users.emailPlaceholder')} />
          </Form.Item>
          {!editingUser && (
            <Form.Item
              name="password"
              label={t('users.password')}
              rules={[{ required: true, message: t('users.passwordRequired') }]}
            >
              <Input.Password placeholder={t('users.passwordPlaceholder')} />
            </Form.Item>
          )}
          <Form.Item
            name="role"
            label={t('users.role')}
            rules={[{ required: true, message: t('users.roleRequired') }]}
          >
            <Select placeholder={t('users.rolePlaceholder')}>
              <Select.Option value={Role.SUPER_ADMIN}>{t('users.superAdmin')}</Select.Option>
              <Select.Option value={Role.CUSTOMER_SERVICE}>
                {t('users.customerService')}
              </Select.Option>
              <Select.Option value={Role.USER}>{t('users.normalUser')}</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="status"
            label={t('users.status')}
            rules={[{ required: true, message: t('users.statusRequired') }]}
          >
            <Select placeholder={t('users.statusPlaceholder')}>
              <Select.Option value="active">{t('users.active')}</Select.Option>
              <Select.Option value="inactive">{t('users.inactive')}</Select.Option>
              <Select.Option value="locked">{t('users.locked')}</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

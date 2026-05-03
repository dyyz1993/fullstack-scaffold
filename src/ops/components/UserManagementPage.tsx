import { useState, useEffect, useCallback } from 'react'
import { Table, Card, Button, Modal, Form, Input, Select, Tag, Space, Popconfirm } from 'antd'
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
import { Permission, Role } from '@platform/shared/permission'
import { PermissionGuard } from './PermissionGuard'
import { useOpsStore } from '../stores/opsStore'
import type { User, CreateUserRequest } from '@shared/modules/ops'
import { useMessage } from '../hooks/useAntdStatic'

type UserFormData = CreateUserRequest & { password?: string }

interface UserManagementPageProps {
  roleFilter: 'user' | 'all'
  title: string
  entityLabel: string
  loadingText: string
  allowSelfLock?: boolean
}

export const UserManagementPage: React.FC<UserManagementPageProps> = ({
  roleFilter,
  title,
  entityLabel,
  loadingText,
  allowSelfLock = true,
}) => {
  const message = useMessage()
  const currentUser = useOpsStore(state => state.user)
  const [users, setUsers] = useState<User[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [form] = Form.useForm<UserFormData>()
  const { roleLabels } = useRoleLabels()

  const fetchUsers = useCallback(async () => {
    try {
      const data = await api(apiClient.api.admin.users.$get()).withLoading(loadingText).json()
      if (roleFilter === 'user') {
        setUsers(data.filter((user: User) => user.role === Role.USER))
      } else {
        setUsers(data)
      }
    } catch {
      // ignore fetch errors
    }
  }, [roleFilter, loadingText])

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
          .withLoading('更新中...')
          .json()
        message.success(`${entityLabel}更新成功`)
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
          .withLoading('创建中...')
          .json()
        message.success(`${entityLabel}创建成功`)
        setModalVisible(false)
        fetchUsers()
      }
    } catch {
      // ignore
    }
  }

  const handleToggleLock = async (user: User) => {
    if (!allowSelfLock && currentUser && user.id === currentUser.id) {
      message.error('不能锁定自己的账号')
      return
    }
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
      message.success(newStatus === 'locked' ? `${entityLabel}已锁定` : `${entityLabel}已解锁`)
      fetchUsers()
    } catch {
      // ignore
    }
  }

  const handleDelete = async (userId: string) => {
    try {
      await api(
        apiClient.api.admin.users[':id'].$delete({
          param: { id: userId },
        })
      )
        .withLoading('删除中...')
        .json()
      message.success(`${entityLabel}已删除`)
      fetchUsers()
    } catch {
      // ignore
    }
  }

  const getStatusTag = (status: string) => {
    const statusConfig = {
      active: { color: 'green', text: '正常' },
      inactive: { color: 'orange', text: '未激活' },
      locked: { color: 'red', text: '已锁定' },
    }
    const config = statusConfig[status as keyof typeof statusConfig]
    return <Tag color={config.color}>{config.text}</Tag>
  }

  const columns: ColumnsType<User> = [
    { title: '用户名', dataIndex: 'username', key: 'username' },
    { title: '邮箱', dataIndex: 'email', key: 'email' },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: Role) => <Tag color="blue">{roleLabels[role] || role}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: User) => (
        <Space>
          <PermissionGuard permission={Permission.USER_EDIT}>
            <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
              编辑
            </Button>
          </PermissionGuard>
          <PermissionGuard permission={Permission.USER_EDIT}>
            {allowSelfLock || record.id !== currentUser?.id ? (
              <Button
                type="link"
                icon={record.status === 'locked' ? <UnlockOutlined /> : <LockOutlined />}
                onClick={() => handleToggleLock(record)}
                danger={record.status !== 'locked'}
              >
                {record.status === 'locked' ? '解锁' : '锁定'}
              </Button>
            ) : null}
          </PermissionGuard>
          <PermissionGuard permission={Permission.USER_DELETE}>
            <Popconfirm
              title={`确定要删除此${entityLabel}吗？`}
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" icon={<DeleteOutlined />} danger>
                删除
              </Button>
            </Popconfirm>
          </PermissionGuard>
        </Space>
      ),
    },
  ]

  const roleOptions =
    roleFilter === 'user'
      ? [{ value: Role.USER, label: '普通用户' }]
      : Object.values(Role).map(role => ({ value: role, label: roleLabels[role] || role }))

  return (
    <div className="p-6">
      <Card
        title={title}
        extra={
          <PermissionGuard permission={Permission.USER_CREATE}>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              {`创建${entityLabel}`}
            </Button>
          </PermissionGuard>
        }
      >
        <Table columns={columns} dataSource={users} rowKey="id" />
      </Card>

      <Modal
        title={editingUser ? `编辑${entityLabel}` : `创建${entityLabel}`}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          {!editingUser && (
            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password placeholder="请输入密码" />
            </Form.Item>
          )}
          <Form.Item name="role" label="角色" rules={[{ required: true, message: '请选择角色' }]}>
            <Select placeholder="请选择角色">
              {roleOptions.map(opt => (
                <Select.Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
            <Select placeholder="请选择状态">
              <Select.Option value="active">正常</Select.Option>
              <Select.Option value="inactive">未激活</Select.Option>
              <Select.Option value="locked">已锁定</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

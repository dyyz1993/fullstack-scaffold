import { useEffect, useState } from 'react'
import { Table, Button, Space, Modal, Form, Input, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useTenantStore } from '../stores/tenantStore'

export const UsersPage: React.FC = () => {
  const { users, loading, fetchUsers, createUser, updateUser, deleteUser } = useTenantStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<unknown | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleAdd = () => {
    setEditingUser(null)
    form.resetFields()
    setIsModalOpen(true)
  }

  const handleEdit = (user: unknown) => {
    setEditingUser(user)
    form.setFieldsValue(user)
    setIsModalOpen(true)
  }

  const handleDelete = async (userId: number) => {
    Modal.confirm({
      title: 'Confirm Delete',
      content: 'Are you sure you want to delete this user?',
      okText: 'Yes',
      cancelText: 'No',
      onOk: async () => {
        const success = await deleteUser(userId)
        if (success) {
          message.success('User deleted successfully')
          fetchUsers()
        }
      },
    })
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      if (editingUser) {
        const userId = (editingUser as { id: number }).id
        const success = await updateUser(userId, values)
        if (success) {
          message.success('User updated successfully')
          fetchUsers()
        }
      } else {
        const success = await createUser(values)
        if (success) {
          message.success('User created successfully')
          fetchUsers()
        }
      }

      setIsModalOpen(false)
      form.resetFields()
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  const columns: ColumnsType<unknown> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)}>
            Edit
          </Button>
          <Button
            icon={<DeleteOutlined />}
            size="small"
            danger
            onClick={() => handleDelete(Number((record as { id: unknown }).id))}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div data-testid="tenant-users">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Add User
        </Button>
      </div>
      <Table columns={columns} dataSource={users as unknown[]} loading={loading} rowKey="id" />
      <Modal
        title={editingUser ? 'Edit User' : 'Add User'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => setIsModalOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="username" label="Username" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: !editingUser }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

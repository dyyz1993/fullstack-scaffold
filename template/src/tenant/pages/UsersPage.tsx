import { useEffect, useState } from 'react'
import { Table, Button, Space, Modal, Form, Input, Select, Typography, App } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { EditOutlined, DeleteOutlined, PlusOutlined, UserAddOutlined } from '@ant-design/icons'
import { useTenantStore } from '../stores/tenantStore'
import type { TenantMember } from '@shared/schemas'

/**
 * 租户成员管理：列表（含角色）/邀请新成员（邮件+角色）/改角色/移除。
 * 后端在邀请与接受时执行套餐成员数配额（P4）。
 */
export const UsersPage: React.FC = () => {
  const { users, roles, loading, fetchUsers, fetchRoles, inviteUser, updateUser, deleteUser } =
    useTenantStore()
  const { message } = App.useApp()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [roleTarget, setRoleTarget] = useState<TenantMember | null>(null)
  const [inviteForm] = Form.useForm()
  const [roleForm] = Form.useForm()

  useEffect(() => {
    fetchUsers()
    fetchRoles()
  }, [fetchUsers, fetchRoles])

  const handleInvite = async () => {
    try {
      const values = await inviteForm.validateFields()
      const ok = await inviteUser(values.email, values.roleId)
      if (ok) {
        message.success('Invitation created — the invitee will receive a join link')
        setInviteOpen(false)
        inviteForm.resetFields()
        fetchUsers()
      } else {
        message.error('Failed to create invitation')
      }
    } catch {
      // validation error
    }
  }

  const handleRoleChange = async () => {
    if (!roleTarget) return
    try {
      const values = await roleForm.validateFields()
      const ok = await updateUser(roleTarget.id, { roleId: values.roleId })
      if (ok) {
        message.success('Member role updated')
        setRoleTarget(null)
        fetchUsers()
      } else {
        message.error('Failed to update role')
      }
    } catch {
      // validation error
    }
  }

  const handleRemove = (member: TenantMember) => {
    Modal.confirm({
      title: 'Remove member',
      content: `Remove ${member.userId} from this tenant? They will lose access immediately.`,
      okText: 'Remove',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: async () => {
        const ok = await deleteUser(member.id)
        if (ok) {
          message.success('Member removed')
          fetchUsers()
        } else {
          message.error('Failed to remove member')
        }
      },
    })
  }

  const columns: ColumnsType<TenantMember> = [
    { title: 'Account', dataIndex: 'username', key: 'username' },
    {
      title: 'Role',
      key: 'role',
      render: (_, record) => (
        <Typography.Text code>{record.role?.label ?? record.roleId}</Typography.Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
    },
    {
      title: 'Joined',
      dataIndex: 'joinedAt',
      key: 'joinedAt',
      render: (v: string) => (v ? new Date(v).toLocaleDateString() : '-'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => {
              setRoleTarget(record)
              roleForm.setFieldsValue({ roleId: record.roleId })
            }}
          >
            Role
          </Button>
          <Button
            icon={<DeleteOutlined />}
            size="small"
            danger
            onClick={() => handleRemove(record)}
          >
            Remove
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div data-testid="tenant-users">
      <div className="flex justify-between items-center mb-4">
        <Typography.Title level={5} className="!mb-0">
          Members
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setInviteOpen(true)}>
          Invite member
        </Button>
      </div>
      <Table columns={columns} dataSource={users} loading={loading} rowKey="id" />

      <Modal
        title={
          <span>
            <UserAddOutlined /> Invite member
          </span>
        }
        open={inviteOpen}
        onOk={handleInvite}
        onCancel={() => setInviteOpen(false)}
        okText="Send invitation"
      >
        <Typography.Paragraph type="secondary">
          An invitation link (valid for 7 days) will be generated for the invitee.
        </Typography.Paragraph>
        <Form form={inviteForm} layout="vertical">
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please input email' },
              { type: 'email', message: 'Invalid email' },
            ]}
          >
            <Input placeholder="teammate@example.com" />
          </Form.Item>
          <Form.Item
            name="roleId"
            label="Role"
            rules={[{ required: true, message: 'Pick a role' }]}
          >
            <Select
              placeholder="Select role"
              options={roles.map(r => ({ value: r.id, label: r.label }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Change member role"
        open={!!roleTarget}
        onOk={handleRoleChange}
        onCancel={() => setRoleTarget(null)}
        okText="Save"
      >
        <Form form={roleForm} layout="vertical">
          <Form.Item name="roleId" label="Role" rules={[{ required: true }]}>
            <Select options={roles.map(r => ({ value: r.id, label: r.label }))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

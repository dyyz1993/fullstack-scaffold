import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Users, Mail, MoreHorizontal, Trash2, Edit, UserPlus } from 'lucide-react'
import {
  Button,
  Table,
  Tag,
  Dropdown,
  Modal,
  Form,
  Input,
  Select,
  message,
  Avatar,
  Empty,
  Spin,
} from 'antd'
import type { MenuProps } from 'antd'
import { useTenantStore, type TenantMember } from '../stores/tenantStore'
import { tenantApi } from '../services/tenantApi'

export const MembersPage: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>()
  const { members, roles, setMembers } = useTenantStore()
  const [loading, setLoading] = useState(false)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [form] = Form.useForm()

  const loadMembers = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    try {
      const data = await tenantApi.getMembers(tenantId)
      setMembers(data)
    } catch {
      message.error('加载成员失败')
    } finally {
      setLoading(false)
    }
  }, [tenantId, setMembers])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  const handleInvite = async (values: { email: string; roleId: string }) => {
    if (!tenantId) return
    try {
      const invitation = await tenantApi.inviteMember(tenantId, values)
      setInviteLink(`${window.location.origin}/invite/${invitation.token}`)
      message.success('邀请已发送')
    } catch {
      message.error('邀请失败')
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    Modal.confirm({
      title: '确认移除',
      content: '确定要移除该成员吗？',
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        if (!tenantId) return
        try {
          await tenantApi.removeMember(tenantId, memberId)
          message.success('成员已移除')
          loadMembers()
        } catch {
          message.error('移除失败')
        }
      },
    })
  }

  const handleUpdateRole = async (memberId: string, roleId: string) => {
    if (!tenantId) return
    try {
      await tenantApi.updateMember(tenantId, memberId, { roleId })
      message.success('角色已更新')
      loadMembers()
    } catch {
      message.error('更新失败')
    }
  }

  const getRoleLabel = (roleId: string) => {
    const role = roles.find(r => r.id === roleId)
    return role?.label || roleId
  }

  const getRoleColor = (roleId: string) => {
    const role = roles.find(r => r.id === roleId)
    if (role?.code === 'tenant_admin') return 'red'
    if (role?.code === 'tenant_member') return 'blue'
    return 'default'
  }

  const columns = [
    {
      title: '成员',
      key: 'member',
      render: (_: unknown, record: TenantMember) => (
        <div className="flex items-center gap-3">
          <Avatar icon={<Users className="w-4 h-4" />} />
          <div>
            <div className="font-medium">{record.userId}</div>
            <div className="text-xs text-gray-400">ID: {record.id}</div>
          </div>
        </div>
      ),
    },
    {
      title: '角色',
      key: 'role',
      render: (_: unknown, record: TenantMember) => (
        <Tag color={getRoleColor(record.roleId)}>{getRoleLabel(record.roleId)}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {status === 'active' ? '活跃' : status}
        </Tag>
      ),
    },
    {
      title: '加入时间',
      dataIndex: 'joinedAt',
      key: 'joinedAt',
      render: (date: number | null) => (date ? new Date(date).toLocaleDateString() : '-'),
    },
    {
      title: '最后活跃',
      dataIndex: 'lastActiveAt',
      key: 'lastActiveAt',
      render: (date: number | null) => (date ? new Date(date).toLocaleDateString() : '-'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: TenantMember) => {
        const items: MenuProps['items'] = [
          {
            key: 'changeRole',
            icon: <Edit className="w-4 h-4" />,
            label: '修改角色',
            children: roles.map(role => ({
              key: role.id,
              label: role.label,
              onClick: () => handleUpdateRole(record.id, role.id),
            })),
          },
          { type: 'divider' },
          {
            key: 'remove',
            icon: <Trash2 className="w-4 h-4" />,
            label: '移除成员',
            danger: true,
            onClick: () => handleRemoveMember(record.id),
          },
        ]

        return (
          <Dropdown menu={{ items }} trigger={['click']}>
            <Button type="text" icon={<MoreHorizontal className="w-4 h-4" />} />
          </Dropdown>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">成员管理</h1>
          <p className="text-gray-500 mt-1">管理租户内的成员和权限</p>
        </div>
        <Button
          type="primary"
          icon={<UserPlus className="w-4 h-4" />}
          onClick={() => setInviteModalOpen(true)}
        >
          邀请成员
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="flex justify-center py-12">
            <Spin size="large" />
          </div>
        ) : members.length === 0 ? (
          <Empty description="暂无成员" className="py-12" />
        ) : (
          <Table columns={columns} dataSource={members} rowKey="id" pagination={false} />
        )}
      </div>

      <Modal
        title="邀请成员"
        open={inviteModalOpen}
        onCancel={() => {
          setInviteModalOpen(false)
          setInviteLink(null)
          form.resetFields()
        }}
        footer={null}
      >
        {inviteLink ? (
          <div className="space-y-4">
            <p className="text-gray-600">邀请链接已生成，请复制并发送给被邀请人：</p>
            <Input.Group compact>
              <Input value={inviteLink} readOnly style={{ width: 'calc(100% - 80px)' }} />
              <Button
                type="primary"
                onClick={() => {
                  navigator.clipboard.writeText(inviteLink)
                  message.success('已复制到剪贴板')
                }}
              >
                复制
              </Button>
            </Input.Group>
            <p className="text-xs text-gray-400">链接有效期：7 天</p>
          </div>
        ) : (
          <Form form={form} layout="vertical" onFinish={handleInvite}>
            <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email' }]}>
              <Input
                prefix={<Mail className="w-4 h-4 text-gray-400" />}
                placeholder="user@example.com"
              />
            </Form.Item>
            <Form.Item name="roleId" label="角色" rules={[{ required: true }]}>
              <Select placeholder="选择角色">
                {roles.map(role => (
                  <Select.Option key={role.id} value={role.id}>
                    {role.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item className="mb-0 text-right">
              <Button type="primary" htmlType="submit">
                发送邀请
              </Button>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  )
}

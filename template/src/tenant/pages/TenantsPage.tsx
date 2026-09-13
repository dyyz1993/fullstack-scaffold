import { useEffect, useState } from 'react'
import { Table, Typography, Alert, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { api } from '../services/tenantApi'

/**
 * 平台租户列表（仅平台超级管理员可用，服务端 403 兜底）。
 * 数据源：GET /api/tenants——此前该 API 一直 200 但控制台无对应页面。
 */
interface PlatformTenant {
  id: number
  name: string
  slug: string
  status: string
  plan: string
  maxUsers: number
  createdAt: string
}

const PLAN_COLOR: Record<string, string> = {
  free: 'default',
  starter: 'blue',
  pro: 'gold',
  enterprise: 'purple',
}

const STATUS_COLOR: Record<string, string> = {
  active: 'green',
  trial: 'blue',
  suspended: 'red',
  cancelled: 'default',
}

export const TenantsPage: React.FC = () => {
  const [tenants, setTenants] = useState<PlatformTenant[]>([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)

  useEffect(() => {
    async function load() {
      const res = await api<{ items: PlatformTenant[] }>('/tenants')
      if (res.status === 403) {
        setForbidden(true)
      } else if (res.success && res.data) {
        setTenants(res.data.items ?? [])
      }
      setLoading(false)
    }
    load()
  }, [])

  const columns: ColumnsType<PlatformTenant> = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 70 },
    { title: '租户名称', dataIndex: 'name', key: 'name' },
    { title: 'Slug', dataIndex: 'slug', key: 'slug' },
    {
      title: '套餐',
      dataIndex: 'plan',
      key: 'plan',
      render: (plan: string) => <Tag color={PLAN_COLOR[plan] ?? 'default'}>{plan}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag color={STATUS_COLOR[status] ?? 'default'}>{status}</Tag>,
    },
    { title: '成员上限', dataIndex: 'maxUsers', key: 'maxUsers', width: 100 },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => {
        const ts = Number(v)
        return isNaN(ts) ? v : new Date(ts).toLocaleString()
      },
    },
  ]

  return (
    <div data-testid="tenant-tenants-page">
      <Typography.Title level={4}>平台租户</Typography.Title>
      {forbidden ? (
        <Alert
          type="warning"
          showIcon
          message="需要平台超级管理员权限"
          description="当前账号无权查看平台租户列表。请使用平台管理员账号登录。"
        />
      ) : (
        <Table
          rowKey="id"
          columns={columns}
          dataSource={tenants}
          loading={loading}
          pagination={false}
        />
      )}
    </div>
  )
}

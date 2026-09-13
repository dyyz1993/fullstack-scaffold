import { useEffect, useState } from 'react'
import { Table, Typography, Alert, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { api } from '../services/tenantApi'

/**
 * 平台审计日志（仅平台超级管理员可用，服务端 403 兜底）。
 * 数据源：GET /api/audit-logs——全局操作流（当前无租户维度端点）。
 */
interface AuditLog {
  id: string
  userId: string
  action: string
  resourceType: string
  resourceId: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

const ACTION_COLOR: Record<string, string> = {
  create: 'green',
  update: 'blue',
  delete: 'red',
  login: 'geekblue',
  logout: 'default',
}

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)

  useEffect(() => {
    async function load() {
      const res = await api<AuditLog[]>('/audit-logs?limit=100')
      if (res.status === 403) {
        setForbidden(true)
      } else if (res.success && res.data) {
        setLogs(res.data)
      }
      setLoading(false)
    }
    load()
  }, [])

  const columns: ColumnsType<AuditLog> = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (v: string) => new Date(v).toLocaleString(),
    },
    { title: '用户', dataIndex: 'userId', key: 'userId', width: 160 },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (action: string) => <Tag color={ACTION_COLOR[action] ?? 'default'}>{action}</Tag>,
    },
    { title: '资源类型', dataIndex: 'resourceType', key: 'resourceType', width: 120 },
    { title: '资源 ID', dataIndex: 'resourceId', key: 'resourceId' },
    { title: 'IP', dataIndex: 'ipAddress', key: 'ipAddress', width: 140 },
    { title: 'User-Agent', dataIndex: 'userAgent', key: 'userAgent', ellipsis: true },
  ]

  return (
    <div data-testid="tenant-audit-page">
      <Typography.Title level={4}>审计日志</Typography.Title>
      {forbidden ? (
        <Alert
          type="warning"
          showIcon
          message="需要平台超级管理员权限"
          description="当前账号无权查看审计日志。请使用平台管理员账号登录。"
        />
      ) : (
        <Table
          rowKey="id"
          columns={columns}
          dataSource={logs}
          loading={loading}
          pagination={{ pageSize: 20, showSizeChanger: false }}
          size="middle"
        />
      )}
    </div>
  )
}

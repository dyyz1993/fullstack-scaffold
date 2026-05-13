import { useState, useEffect, useCallback } from 'react'
import { Card, Table, Tag, Button, Space, message, Modal, Input, Popconfirm, Tooltip } from 'antd'
import {
  Package,
  Clock,
  Download,
  Users,
  CheckCircle,
  XCircle,
  Star,
  TrendingUp,
} from 'lucide-react'
import type { ColumnsType } from 'antd/es/table'
import { apiClient, api } from '../services/apiClient'
import type { AdminDashboardStats, AdminPlugin } from '@shared/modules/plugins'

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  pending: { color: 'orange', label: '待审核' },
  approved: { color: 'green', label: '已通过' },
  rejected: { color: 'red', label: '已拒绝' },
}

export const PluginDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null)
  const [recentSubmissions, setRecentSubmissions] = useState<AdminPlugin[]>([])
  const [loading, setLoading] = useState(true)
  const [rejectModalVisible, setRejectModalVisible] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api(apiClient.api.stats.dashboard.$get()).withLoading('加载中...').json()
      setStats(data)
      setRecentSubmissions(data.recentSubmissions || [])
    } catch {
      // 错误已由 api-request 自动处理
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  const handleApprove = async (slug: string) => {
    try {
      await api(apiClient.api.plugins[':slug'].approve.$put({ param: { slug } }))
        .withLoading('审核通过中...')
        .json()
      message.success('插件已通过审核')
      fetchDashboard()
    } catch {
      // 错误已由 api-request 自动处理
    }
  }

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) {
      message.warning('请填写拒绝原因')
      return
    }
    try {
      await api(
        apiClient.api.plugins[':slug'].reject.$put({
          param: { slug: rejectTarget },
          json: { reason: rejectReason },
        })
      )
        .withLoading('拒绝中...')
        .json()
      message.success('插件已拒绝')
      setRejectModalVisible(false)
      setRejectTarget(null)
      setRejectReason('')
      fetchDashboard()
    } catch {
      // 错误已由 api-request 自动处理
    }
  }

  const openRejectModal = (slug: string) => {
    setRejectTarget(slug)
    setRejectReason('')
    setRejectModalVisible(true)
  }

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  const statCards = [
    {
      title: '总插件数',
      value: stats?.totalPlugins ?? 0,
      icon: Package,
      color: 'bg-blue-500',
    },
    {
      title: '待审核',
      value: stats?.pendingPlugins ?? 0,
      icon: Clock,
      color: 'bg-orange-500',
    },
    {
      title: '总下载量',
      value: stats?.totalDownloads ?? 0,
      icon: Download,
      color: 'bg-green-500',
    },
    {
      title: '开发者数',
      value: stats?.totalDevelopers ?? 0,
      icon: Users,
      color: 'bg-purple-500',
    },
  ]

  const columns: ColumnsType<AdminPlugin> = [
    {
      title: '插件名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: AdminPlugin) => (
        <div>
          <div className="font-medium">{name}</div>
          <div className="text-xs text-gray-400">{record.slug}</div>
        </div>
      ),
    },
    {
      title: '作者',
      dataIndex: 'authorName',
      key: 'authorName',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const cfg = STATUS_CONFIG[status]
        return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : <Tag>{status}</Tag>
      },
    },
    {
      title: '下载',
      dataIndex: 'downloadCount',
      key: 'downloadCount',
      sorter: (a: AdminPlugin, b: AdminPlugin) => a.downloadCount - b.downloadCount,
      render: (count: number) => (
        <span className="flex items-center gap-1">
          <Download className="w-3 h-3" /> {count}
        </span>
      ),
    },
    {
      title: '评分',
      key: 'rating',
      render: (_: unknown, record: AdminPlugin) =>
        record.avgRating != null ? (
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-500" /> {record.avgRating.toFixed(1)}
          </span>
        ) : (
          '-'
        ),
    },
    {
      title: '提交时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (ts: number) => new Date(ts).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: AdminPlugin) => (
        <Space>
          {record.status === 'pending' && (
            <>
              <Popconfirm
                title="确定通过此插件审核？"
                onConfirm={() => handleApprove(record.slug)}
                okText="通过"
                cancelText="取消"
              >
                <Button type="link" size="small" icon={<CheckCircle className="w-4 h-4" />}>
                  通过
                </Button>
              </Popconfirm>
              <Button
                type="link"
                size="small"
                danger
                icon={<XCircle className="w-4 h-4" />}
                onClick={() => openRejectModal(record.slug)}
              >
                拒绝
              </Button>
            </>
          )}
          {record.status === 'approved' && (
            <Tag color="green" icon={<CheckCircle className="w-3 h-3" />}>
              已通过
            </Tag>
          )}
          {record.status === 'rejected' && (
            <Tooltip title={record.rejectReason}>
              <Tag color="red">已拒绝</Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">插件市场</h1>
          <p className="text-gray-600 mt-1">插件管理与审核概览</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, idx) => {
          const Icon = card.icon
          return (
            <Card key={idx} className="shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500">{card.title}</div>
                  <div className="text-2xl font-bold mt-1">
                    {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${card.color}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <Card
        title={
          <span className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> 最近提交
          </span>
        }
        className="shadow-sm"
      >
        <Table
          columns={columns}
          dataSource={recentSubmissions}
          rowKey="id"
          pagination={{ pageSize: 5 }}
          size="middle"
        />
      </Card>

      <Modal
        title="拒绝插件"
        open={rejectModalVisible}
        onOk={handleReject}
        onCancel={() => {
          setRejectModalVisible(false)
          setRejectTarget(null)
          setRejectReason('')
        }}
        okText="确认拒绝"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <div className="mb-4">
          <p className="text-sm text-gray-500 mb-2">请填写拒绝原因：</p>
          <Input.TextArea
            rows={4}
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="请输入拒绝原因..."
            maxLength={500}
            showCount
          />
        </div>
      </Modal>
    </div>
  )
}

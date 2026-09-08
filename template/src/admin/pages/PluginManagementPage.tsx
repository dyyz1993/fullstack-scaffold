import { useState, useEffect, useCallback } from 'react'
import { Table, Card, Tag, Button, Space, Select, Input, Modal, Popconfirm, message } from 'antd'
import { CheckCircle, XCircle, Star, Download, Trash2, Search, RefreshCw } from 'lucide-react'
import type { ColumnsType } from 'antd/es/table'
import { apiClient, api } from '../services/apiClient'
import type { Plugin } from '@shared/modules/plugins'
import { useLanguage } from '../i18n/useLanguage'

type PluginStatus = 'pending' | 'approved' | 'rejected'

const STATUS_VALUES = ['pending', 'approved', 'rejected'] as const

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  pending: { color: 'orange', label: '待审核' },
  approved: { color: 'green', label: '已通过' },
  rejected: { color: 'red', label: '已拒绝' },
}

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: '待审核' },
  { value: 'approved', label: '已通过' },
  { value: 'rejected', label: '已拒绝' },
]

export const PluginManagementPage: React.FC = () => {
  const { formatDate } = useLanguage()
  const [plugins, setPlugins] = useState<Plugin[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [rejectModalVisible, setRejectModalVisible] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const fetchPlugins = useCallback(async () => {
    setLoading(true)
    try {
      const query: Record<string, unknown> = { page, limit: 20 }
      if (statusFilter && STATUS_VALUES.includes(statusFilter as PluginStatus)) {
        query.status = statusFilter
      }
      const result = await api(apiClient.api.plugins.$get({ query })).withLoading().json()
      setPlugins(result.plugins)
      setTotal(result.total)
    } catch {
      // 错误已由 api-request 自动处理
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    fetchPlugins()
  }, [fetchPlugins])

  const handleSearch = () => {
    const term = search.toLowerCase().trim()
    if (!term) {
      fetchPlugins()
      return
    }
    setPlugins(prev =>
      prev.filter(
        p =>
          p.name.toLowerCase().includes(term) ||
          p.authorName.toLowerCase().includes(term) ||
          p.slug.toLowerCase().includes(term)
      )
    )
  }

  const handleApprove = async (slug: string) => {
    try {
      await api(apiClient.api.plugins[':slug'].approve.$put({ param: { slug } }))
        .withLoading('审核通过中...')
        .json()
      message.success('插件已通过审核')
      fetchPlugins()
    } catch {
      // 错误已由 api-request 自动处理
    }
  }

  const openRejectModal = (slug: string) => {
    setRejectTarget(slug)
    setRejectReason('')
    setRejectModalVisible(true)
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
      fetchPlugins()
    } catch {
      // 错误已由 api-request 自动处理
    }
  }

  const handleToggleFeatured = async (slug: string, current: boolean) => {
    try {
      await api(apiClient.api.plugins[':slug'].feature.$put({ param: { slug } }))
        .withLoading(current ? '取消推荐中...' : '设为推荐中...')
        .json()
      message.success(current ? '已取消推荐' : '已设为推荐')
      fetchPlugins()
    } catch {
      // 错误已由 api-request 自动处理
    }
  }

  const handleRemove = async (slug: string) => {
    try {
      await api(apiClient.api.plugins[':slug'].$delete({ param: { slug } }))
        .withLoading('删除中...')
        .json()
      message.success('插件已删除')
      fetchPlugins()
    } catch {
      // 错误已由 api-request 自动处理
    }
  }

  const columns: ColumnsType<Plugin> = [
    {
      title: '插件名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Plugin) => (
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
      title: '下载量',
      dataIndex: 'downloadCount',
      key: 'downloadCount',
      sorter: (a: Plugin, b: Plugin) => a.downloadCount - b.downloadCount,
      render: (count: number) => (
        <span className="flex items-center gap-1">
          <Download className="w-3 h-3" /> {count.toLocaleString()}
        </span>
      ),
    },
    {
      title: '推荐',
      dataIndex: 'featured',
      key: 'featured',
      render: (featured: boolean) =>
        featured ? (
          <Tag color="gold" icon={<Star className="w-3 h-3 inline" />}>
            推荐
          </Tag>
        ) : (
          <Tag>普通</Tag>
        ),
      filters: [
        { text: '推荐', value: true },
        { text: '普通', value: false },
      ],
      onFilter: (value, record) => record.featured === value,
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      render: (v: string) => <code className="text-xs">{v}</code>,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (ts: number) => formatDate(new Date(ts).toISOString()),
      sorter: (a: Plugin, b: Plugin) => a.updatedAt - b.updatedAt,
      defaultSortOrder: 'descend',
    },
    {
      title: '操作',
      key: 'actions',
      width: 280,
      render: (_: unknown, record: Plugin) => (
        <Space size="small" wrap>
          {record.status === 'pending' && (
            <>
              <Popconfirm
                title="确定通过此插件审核？"
                onConfirm={() => handleApprove(record.slug)}
                okText="通过"
                cancelText="取消"
              >
                <Button type="link" size="small" className="text-green-600">
                  <CheckCircle className="w-3.5 h-3.5 mr-1 inline" />
                  通过
                </Button>
              </Popconfirm>
              <Button type="link" size="small" danger onClick={() => openRejectModal(record.slug)}>
                <XCircle className="w-3.5 h-3.5 mr-1 inline" />
                拒绝
              </Button>
            </>
          )}
          <Button
            type="link"
            size="small"
            onClick={() => handleToggleFeatured(record.slug, record.featured)}
          >
            <Star className="w-3.5 h-3.5 mr-1 inline" />
            {record.featured ? '取消推荐' : '推荐'}
          </Button>
          <Popconfirm
            title="确定要删除此插件吗？此操作不可恢复"
            onConfirm={() => handleRemove(record.slug)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger>
              <Trash2 className="w-3.5 h-3.5 mr-1 inline" />
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">插件管理</h1>
          <p className="text-gray-600 mt-1">审核、管理和配置所有插件</p>
        </div>
      </div>

      <Card className="shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <Input.Search
            placeholder="搜索插件名称、作者、Slug..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onSearch={handleSearch}
            style={{ width: 320 }}
            allowClear
            enterButton={
              <span className="flex items-center gap-1">
                <Search className="w-4 h-4" /> 搜索
              </span>
            }
          />
          <Select
            placeholder="筛选状态"
            style={{ width: 140 }}
            value={statusFilter || undefined}
            onChange={(val: string) => {
              setStatusFilter(val || '')
              setPage(1)
            }}
            options={STATUS_OPTIONS}
            allowClear
          />
          <Button icon={<RefreshCw className="w-4 h-4" />} onClick={fetchPlugins}>
            刷新
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={plugins}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: 20,
            total,
            showTotal: t => `共 ${t} 个插件`,
            onChange: p => setPage(p),
          }}
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

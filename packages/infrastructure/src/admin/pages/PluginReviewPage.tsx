import { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Button,
  Space,
  Tag,
  Empty,
  Spin,
  Input,
  Modal,
  Descriptions,
  message,
  Popconfirm,
} from 'antd'
import { CheckCircle, XCircle, ExternalLink, ArrowRight } from 'lucide-react'
import { apiClient, api } from '../services/apiClient'
import type { Plugin } from '@shared/modules/plugins'

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  pending: { color: 'orange', label: '待审核' },
  approved: { color: 'green', label: '已通过' },
  rejected: { color: 'red', label: '已拒绝' },
}

export const PluginReviewPage: React.FC = () => {
  const [pending, setPending] = useState<Plugin[]>([])
  const [loading, setLoading] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [rejectModalVisible, setRejectModalVisible] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const fetchPending = useCallback(async () => {
    setLoading(true)
    try {
      const result = await api(
        apiClient.api.plugins.$get({ query: { status: 'pending', limit: 50, page: 1 } })
      )
        .withLoading()
        .json()
      setPending(result.plugins)
      setCurrentIndex(0)
    } catch {
      // handled by api-request
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPending()
  }, [fetchPending])

  const current = pending[currentIndex]

  const handleApprove = async () => {
    if (!current) return
    try {
      await api(apiClient.api.plugins[':slug'].approve.$put({ param: { slug: current.slug } }))
        .withLoading('审核通过中...')
        .json()
      message.success(`插件 "${current.name}" 已通过审核`)
      setPending(prev => prev.filter(p => p.id !== current.id))
      setCurrentIndex(prev => Math.min(prev, Math.max(0, pending.length - 2)))
    } catch {
      // handled
    }
  }

  const openRejectModal = () => {
    setRejectReason('')
    setRejectModalVisible(true)
  }

  const handleReject = async () => {
    if (!current || !rejectReason.trim()) {
      message.warning('请填写拒绝原因')
      return
    }
    try {
      await api(
        apiClient.api.plugins[':slug'].reject.$put({
          param: { slug: current.slug },
          json: { reason: rejectReason },
        })
      )
        .withLoading('拒绝中...')
        .json()
      message.success(`插件 "${current.name}" 已拒绝`)
      setPending(prev => prev.filter(p => p.id !== current.id))
      setCurrentIndex(prev => Math.min(prev, Math.max(0, pending.length - 2)))
      setRejectModalVisible(false)
    } catch {
      // handled
    }
  }

  const goNext = () => setCurrentIndex(prev => Math.min(prev + 1, pending.length - 1))
  const goPrev = () => setCurrentIndex(prev => Math.max(prev - 1, 0))

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" tip="加载待审核插件..." />
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">插件审核</h1>
          <p className="text-gray-600 mt-1">
            待审核插件：{pending.length} 个
            {pending.length > 0 && ` (${currentIndex + 1}/${pending.length})`}
          </p>
        </div>
        <Button onClick={fetchPending}>刷新列表</Button>
      </div>

      {pending.length === 0 ? (
        <Card>
          <Empty description="没有待审核的插件" />
        </Card>
      ) : (
        current && (
          <Card
            className="shadow-sm"
            title={
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold">{current.name}</span>
                <Tag color={STATUS_CONFIG[current.status]?.color}>
                  {STATUS_CONFIG[current.status]?.label}
                </Tag>
                {current.featured && <Tag color="gold">推荐</Tag>}
              </div>
            }
            extra={
              <Space>
                <Button
                  onClick={goPrev}
                  disabled={currentIndex === 0}
                  icon={<ArrowRight className="w-4 h-4 rotate-180" />}
                >
                  上一个
                </Button>
                <Button
                  onClick={goNext}
                  disabled={currentIndex >= pending.length - 1}
                  icon={<ArrowRight className="w-4 h-4" />}
                >
                  下一个
                </Button>
              </Space>
            }
          >
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Slug">
                <code className="text-xs">{current.slug}</code>
              </Descriptions.Item>
              <Descriptions.Item label="作者">{current.authorName}</Descriptions.Item>
              <Descriptions.Item label="版本">
                <code className="text-xs">{current.version}</code>
              </Descriptions.Item>
              <Descriptions.Item label="下载量">{current.downloadCount}</Descriptions.Item>
              <Descriptions.Item label="描述" span={2}>
                {current.description}
              </Descriptions.Item>
              {current.repositoryUrl && (
                <Descriptions.Item label="仓库地址">
                  <a
                    href={current.repositoryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" /> {current.repositoryUrl}
                  </a>
                </Descriptions.Item>
              )}
              {current.homepageUrl && (
                <Descriptions.Item label="主页">
                  <a
                    href={current.homepageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" /> {current.homepageUrl}
                  </a>
                </Descriptions.Item>
              )}
              {current.license && (
                <Descriptions.Item label="许可证">{current.license}</Descriptions.Item>
              )}
              {current.npmPackage && (
                <Descriptions.Item label="NPM 包">
                  <code className="text-xs">{current.npmPackage}</code>
                </Descriptions.Item>
              )}
              {current.tags && current.tags.length > 0 && (
                <Descriptions.Item label="标签" span={2}>
                  {current.tags.map(tag => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </Descriptions.Item>
              )}
            </Descriptions>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <Popconfirm
                title="确定通过此插件审核？"
                onConfirm={handleApprove}
                okText="通过"
                cancelText="取消"
              >
                <Button type="primary" icon={<CheckCircle className="w-4 h-4" />}>
                  通过审核
                </Button>
              </Popconfirm>
              <Button danger icon={<XCircle className="w-4 h-4" />} onClick={openRejectModal}>
                拒绝
              </Button>
            </div>
          </Card>
        )
      )}

      <Modal
        title={`拒绝插件${current ? ` - ${current.name}` : ''}`}
        open={rejectModalVisible}
        onOk={handleReject}
        onCancel={() => {
          setRejectModalVisible(false)
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

import { useState, useEffect, useCallback } from 'react'
import { Table, Card, Tag, Button, Space, Modal, Form, Input, Select, message } from 'antd'
import { Plus, Edit, Delete } from 'lucide-react'
import { PermissionGuard } from '../components/PermissionGuard'
import { Permission } from '@shared/modules/permission'
import { apiClient } from '../services/apiClient'
import type { Content, CreateContentInput } from '@shared/modules/content'
import { useLanguage } from '../i18n/useLanguage'

const STATUS_COLORS: Record<string, string> = {
  draft: 'default',
  published: 'success',
  archived: 'warning',
}

export const ContentPage: React.FC = () => {
  const { t, formatDate } = useLanguage()
  const [contents, setContents] = useState<Content[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingContent, setEditingContent] = useState<Content | null>(null)
  const [form] = Form.useForm<CreateContentInput>()

  const getCategoryLabel = (category: string) => {
    const map: Record<string, string> = {
      article: t('content.catArticle'),
      announcement: t('content.catAnnouncement'),
      tutorial: t('content.catTutorial'),
      news: t('content.catNews'),
      policy: t('content.catPolicy'),
    }
    return map[category] || category
  }

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      draft: t('content.statusDraft'),
      published: t('content.statusPublished'),
      archived: t('content.statusArchived'),
    }
    return map[status] || status
  }

  const fetchContents = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiClient.api.contents.$get({ query: {} })
      const result = await response.json()
      if (result.success) {
        setContents(result.data)
      } else {
        message.error(t('content.loadFailed'))
      }
    } catch {
      message.error(t('content.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchContents()
  }, [fetchContents])

  const handleCreate = () => {
    setEditingContent(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (content: Content) => {
    setEditingContent(content)
    form.setFieldsValue(content)
    setModalVisible(true)
  }

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: t('content.confirmDelete'),
      content: t('content.confirmDeleteContent'),
      onOk: async () => {
        try {
          const response = await apiClient.api.contents[':id'].$delete({
            param: { id },
          })
          const result = await response.json()
          if (result.success) {
            message.success(t('content.deleted'))
            fetchContents()
          }
        } catch {
          message.error(t('content.deleteFailed'))
        }
      },
    })
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      if (editingContent) {
        const response = await apiClient.api.contents[':id'].$put({
          param: { id: editingContent.id },
          json: values,
        })
        const result = await response.json()
        if (result.success) {
          message.success(t('content.updated'))
          setModalVisible(false)
          fetchContents()
        }
      } else {
        const response = await apiClient.api.contents.$post({
          json: values,
        })
        const result = await response.json()
        if (result.success) {
          message.success(t('content.created'))
          setModalVisible(false)
          fetchContents()
        }
      }
    } catch {
      message.error(t('common.error'))
    }
  }

  const columns = [
    {
      title: t('content.titleCol'),
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: t('content.category'),
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => <Tag>{getCategoryLabel(category)}</Tag>,
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag color={STATUS_COLORS[status]}>{getStatusLabel(status)}</Tag>,
    },
    {
      title: t('content.author'),
      dataIndex: 'author',
      key: 'author',
    },
    {
      title: t('content.viewsLikes'),
      key: 'stats',
      render: (_: unknown, record: Content) => (
        <span>
          {record.viewCount} / {record.likeCount}
        </span>
      ),
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
      render: (_: unknown, record: Content) => (
        <Space>
          <PermissionGuard permission={Permission.CONTENT_EDIT}>
            <Button
              type="link"
              size="small"
              icon={<Edit className="w-4 h-4" />}
              onClick={() => handleEdit(record)}
            >
              {t('common.edit')}
            </Button>
          </PermissionGuard>
          <PermissionGuard permission={Permission.CONTENT_DELETE}>
            <Button
              type="link"
              size="small"
              danger
              icon={<Delete className="w-4 h-4" />}
              onClick={() => handleDelete(record.id)}
            >
              {t('common.delete')}
            </Button>
          </PermissionGuard>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('content.title')}</h1>
          <p className="text-gray-600 mt-1">{t('content.subtitle')}</p>
        </div>
        <PermissionGuard permission={Permission.CONTENT_CREATE}>
          <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={handleCreate}>
            {t('content.createContent')}
          </Button>
        </PermissionGuard>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={contents}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingContent ? t('content.editContent') : t('content.createContent')}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label={t('content.titleCol')}
            rules={[{ required: true, message: t('content.titleRequired') }]}
          >
            <Input placeholder={t('content.titlePlaceholder')} />
          </Form.Item>
          <Form.Item
            name="category"
            label={t('content.category')}
            rules={[{ required: true, message: t('content.categoryRequired') }]}
          >
            <Select placeholder={t('content.categoryPlaceholder')}>
              <Select.Option value="article">{t('content.catArticle')}</Select.Option>
              <Select.Option value="announcement">{t('content.catAnnouncement')}</Select.Option>
              <Select.Option value="tutorial">{t('content.catTutorial')}</Select.Option>
              <Select.Option value="news">{t('content.catNews')}</Select.Option>
              <Select.Option value="policy">{t('content.catPolicy')}</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="content"
            label={t('content.contentLabel')}
            rules={[{ required: true, message: t('content.contentRequired') }]}
          >
            <Input.TextArea rows={6} placeholder={t('content.contentPlaceholder')} />
          </Form.Item>
          <Form.Item name="tags" label={t('content.tags')}>
            <Select mode="tags" placeholder={t('content.tagsPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import {
  Table,
  Card,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  message,
  Popconfirm,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { apiClient, api } from '../services/apiClient'
import type { Category } from '@shared/modules/plugins'

type CategoryFormValues = Pick<Category, 'name' | 'slug'> & {
  description?: string
  icon?: string
  sortOrder?: number
}

export const CategoryManagementPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [form] = Form.useForm<CategoryFormValues>()

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api(apiClient.api.categories.$get()).withLoading('加载分类...').json()
      if (Array.isArray(data)) {
        setCategories(data)
      }
    } catch {
      // 错误已由 api-request 自动处理
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const handleCreate = () => {
    setEditingCategory(null)
    form.resetFields()
    form.setFieldsValue({ sortOrder: 0 })
    setModalVisible(true)
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    form.setFieldsValue({
      name: category.name,
      slug: category.slug,
      description: category.description ?? undefined,
      icon: category.icon ?? undefined,
      sortOrder: category.sortOrder,
    })
    setModalVisible(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      if (editingCategory) {
        await api(
          apiClient.api.categories[':id'].$put({
            param: { id: editingCategory.id },
            json: values,
          })
        )
          .withLoading('更新中...')
          .json()
        message.success('分类已更新')
      } else {
        await api(apiClient.api.categories.$post({ json: values }))
          .withLoading('创建中...')
          .json()
        message.success('分类已创建')
      }

      setModalVisible(false)
      fetchCategories()
    } catch {
      // 错误已由 api-request 自动处理
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api(apiClient.api.categories[':id'].$delete({ param: { id } }))
        .withLoading('删除中...')
        .json()
      message.success('分类已删除')
      fetchCategories()
    } catch {
      // 错误已由 api-request 自动处理
    }
  }

  const columns: ColumnsType<Category> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Category) => (
        <div>
          <span className="font-medium">{name}</span>
          {record.icon && <span className="ml-2 text-gray-400">{record.icon}</span>}
        </div>
      ),
    },
    {
      title: 'Slug',
      dataIndex: 'slug',
      key: 'slug',
      render: (slug: string) => (
        <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{slug}</code>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (desc?: string) => desc || <span className="text-gray-300">-</span>,
    },
    {
      title: '图标',
      dataIndex: 'icon',
      key: 'icon',
      render: (icon?: string) => icon || <span className="text-gray-300">-</span>,
    },
    {
      title: '排序',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      sorter: (a: Category, b: Category) => a.sortOrder - b.sortOrder,
      width: 100,
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_: unknown, record: Category) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除此分类吗？"
            description="删除后关联的插件将失去分类标记"
            onConfirm={() => handleDelete(record.id)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
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
          <h1 className="text-2xl font-bold text-gray-900">分类管理</h1>
          <p className="text-gray-600 mt-1">管理插件市场的分类</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          创建分类
        </Button>
      </div>

      <Card className="shadow-sm">
        <Table
          columns={columns}
          dataSource={categories}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20, showTotal: t => `共 ${t} 个分类` }}
        />
      </Card>

      <Modal
        title={editingCategory ? '编辑分类' : '创建分类'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText={editingCategory ? '保存' : '创建'}
        width={520}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="name"
            label="分类名称"
            rules={[{ required: true, message: '请输入分类名称' }]}
          >
            <Input placeholder="例如：AI 工具" />
          </Form.Item>
          <Form.Item
            name="slug"
            label="Slug"
            rules={[
              { required: true, message: '请输入 Slug' },
              { pattern: /^[a-z0-9-]+$/, message: '只能包含小写字母、数字和连字符' },
            ]}
          >
            <Input placeholder="例如：ai-tools" disabled={!!editingCategory} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="分类描述（可选）" maxLength={500} showCount />
          </Form.Item>
          <Form.Item name="icon" label="图标">
            <Input placeholder="图标名称或 Emoji（可选）" />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序" initialValue={0}>
            <InputNumber min={0} max={9999} style={{ width: '100%' }} placeholder="0" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

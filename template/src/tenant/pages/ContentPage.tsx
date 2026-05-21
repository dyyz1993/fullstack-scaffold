import { useEffect, useState } from 'react'
import { List, Card, Button, Modal, Form, Input, Select, message, Tag } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons'
import { useTenantStore } from '../stores/tenantStore'
import type { Topic } from '@shared/schemas'

export const ContentPage: React.FC = () => {
  const { topics, loading, fetchTopics, createTopic, updateTopic, deleteTopic } = useTenantStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null)
  const [viewingTopic, setViewingTopic] = useState<Topic | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    fetchTopics()
  }, [fetchTopics])

  const handleAdd = () => {
    setEditingTopic(null)
    form.resetFields()
    setIsModalOpen(true)
  }

  const handleEdit = (topic: Topic) => {
    setEditingTopic(topic)
    form.setFieldsValue({
      title: topic.title,
      excerpt: topic.excerpt,
      tags: topic.tags.map((t: { label: string }) => t.label),
    })
    setIsModalOpen(true)
  }

  const handleView = (topic: Topic) => {
    setViewingTopic(topic)
  }

  const handleDelete = async (topicId: number) => {
    Modal.confirm({
      title: 'Confirm Delete',
      content: 'Are you sure you want to delete this topic?',
      okText: 'Yes',
      cancelText: 'No',
      onOk: async () => {
        const success = await deleteTopic(topicId)
        if (success) {
          message.success('Topic deleted successfully')
          fetchTopics()
        }
      },
    })
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      const topicData = {
        title: values.title,
        excerpt: values.excerpt,
        tags: values.tags?.map((t: string) => ({ label: t, color: 'blue' })) || [],
      }

      if (editingTopic) {
        const success = await updateTopic(Number(editingTopic.id), topicData)
        if (success) {
          message.success('Topic updated successfully')
          fetchTopics()
        }
      } else {
        const success = await createTopic(topicData)
        if (success) {
          message.success('Topic created successfully')
          fetchTopics()
        }
      }

      setIsModalOpen(false)
      form.resetFields()
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'hot':
        return 'red'
      case 'solved':
        return 'green'
      default:
        return 'default'
    }
  }

  return (
    <div data-testid="tenant-content">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Content</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Add Topic
        </Button>
      </div>
      <List
        loading={loading}
        grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4 }}
        dataSource={topics}
        renderItem={topic => (
          <List.Item>
            <Card
              title={topic.title}
              actions={[
                <Button
                  key="view"
                  type="text"
                  icon={<EyeOutlined />}
                  onClick={() => handleView(topic)}
                >
                  View
                </Button>,
                <Button
                  key="edit"
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit(topic)}
                >
                  Edit
                </Button>,
                <Button
                  key="delete"
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDelete(Number(topic.id))}
                >
                  Delete
                </Button>,
              ]}
            >
              <Card.Meta
                description={
                  <div>
                    <p className="mb-2">{topic.excerpt}</p>
                    <Tag color={getStatusColor(topic.status)}>{topic.status}</Tag>
                  </div>
                }
              />
            </Card>
          </List.Item>
        )}
      />
      <Modal
        title={editingTopic ? 'Edit Topic' : 'Add Topic'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => setIsModalOpen(false)}
        destroyOnClose
        width={800}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="excerpt" label="Excerpt" rules={[{ required: true }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="tags" label="Tags">
            <Select mode="tags" placeholder="Add tags" />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={viewingTopic?.title}
        open={!!viewingTopic}
        onCancel={() => setViewingTopic(null)}
        footer={[
          <Button key="close" onClick={() => setViewingTopic(null)}>
            Close
          </Button>,
        ]}
        width={800}
      >
        {viewingTopic && (
          <div>
            <div className="mb-4">
              <Tag color={getStatusColor(viewingTopic.status)}>{viewingTopic.status}</Tag>
            </div>
            <p>{viewingTopic.excerpt}</p>
            {viewingTopic.tags && viewingTopic.tags.length > 0 && (
              <div className="mt-4">
                {viewingTopic.tags.map((tag: { label: string }, index: number) => (
                  <Tag key={index}>{tag.label}</Tag>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

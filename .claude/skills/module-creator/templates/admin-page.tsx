// template/src/admin/pages/{Name}Page.tsx
import { useEffect, useState } from 'react'
import { Table, Button, Space, Modal, Form, Input, message, Popconfirm } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { apiClient } from '@client/services/apiClient'
import type { {Name}, Create{Name}Input } from '@shared/schemas'

export const {Name}Page: React.FC = () => {
  const [items, setItems] = useState<{Name}[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<{Name} | null>(null)
  const [form] = Form.useForm()

  const fetchItems = async () => {
    setLoading(true)
    try {
      const response = await apiClient.api.admin.{names}.$get()
      const result = await response.json()
      if (result.success) {
        setItems(result.data)
      }
    } catch {
      message.error('Failed to fetch {names}')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchItems() }, [])

  const handleCreate = () => {
    setEditingItem(null)
    form.resetFields()
    setModalOpen(true)
  }

  const handleEdit = (item: {Name}) => {
    setEditingItem(item)
    form.setFieldsValue(item)
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    try {
      const response = await apiClient.api.admin.{names}[':id'].$delete({
        param: { id: String(id) },
      })
      const result = await response.json()
      if (result.success) {
        message.success('Deleted successfully')
        fetchItems()
      }
    } catch {
      message.error('Delete failed')
    }
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    try {
      if (editingItem) {
        const response = await apiClient.api.admin.{names}[':id'].$put({
          param: { id: String(editingItem.id) },
          json: values,
        })
        const result = await response.json()
        if (result.success) {
          message.success('Updated successfully')
        }
      } else {
        const response = await apiClient.api.admin.{names}.$post({ json: values })
        const result = await response.json()
        if (result.success) {
          message.success('Created successfully')
        }
      }
      setModalOpen(false)
      fetchItems()
    } catch {
      message.error('Operation failed')
    }
  }

  const columns: ColumnsType<{Name}> = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    // Add columns for your fields, e.g.:
    // { title: 'Name', dataIndex: 'name', key: 'name' },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="Sure to delete?" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold">{Names} Management</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Add {Name}
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={items}
        rowKey="id"
        loading={loading}
      />

      <Modal
        title={editingItem ? `Edit {Name}` : `Create {Name}`}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
      >
        <Form form={form} layout="vertical">
          {/* Add form fields, e.g.: */}
          {/* <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item> */}
        </Form>
      </Modal>
    </div>
  )
}

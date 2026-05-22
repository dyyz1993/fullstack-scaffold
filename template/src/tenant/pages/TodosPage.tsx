import { useEffect, useState } from 'react'
import { List, Checkbox, Button, Modal, Input, Form, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckOutlined } from '@ant-design/icons'
import { useTenantStore } from '../stores/tenantStore'
import type { Todo } from '@shared/schemas'

export const TodosPage: React.FC = () => {
  const { todos, loading, fetchTodos, createTodo, updateTodo, deleteTodo } = useTenantStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    fetchTodos()
  }, [fetchTodos])

  const handleAdd = () => {
    setEditingTodo(null)
    form.resetFields()
    setIsModalOpen(true)
  }

  const handleEdit = (todo: Todo) => {
    setEditingTodo(todo)
    form.setFieldsValue(todo)
    setIsModalOpen(true)
  }

  const handleDelete = async (todoId: number) => {
    Modal.confirm({
      title: 'Confirm Delete',
      content: 'Are you sure you want to delete this todo?',
      okText: 'Yes',
      cancelText: 'No',
      onOk: async () => {
        const success = await deleteTodo(todoId)
        if (success) {
          message.success('Todo deleted successfully')
          fetchTodos()
        }
      },
    })
  }

  const handleToggleComplete = async (todo: Todo) => {
    const success = await updateTodo(todo.id, {
      status: todo.status === 'completed' ? 'pending' : 'completed',
    })
    if (success) {
      fetchTodos()
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      if (editingTodo) {
        const success = await updateTodo(editingTodo.id, values)
        if (success) {
          message.success('Todo updated successfully')
          fetchTodos()
        }
      } else {
        const success = await createTodo(values)
        if (success) {
          message.success('Todo created successfully')
          fetchTodos()
        }
      }

      setIsModalOpen(false)
      form.resetFields()
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  return (
    <div data-testid="tenant-todos">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Todos</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Add Todo
        </Button>
      </div>
      <List
        loading={loading}
        dataSource={todos}
        renderItem={todo => (
          <List.Item
            actions={[
              <Button
                key="toggle"
                type="text"
                icon={<CheckOutlined />}
                onClick={() => handleToggleComplete(todo)}
                style={{ color: todo.status === 'completed' ? '#52c41a' : undefined }}
              >
                {todo.status === 'completed' ? 'Completed' : 'Complete'}
              </Button>,
              <Button
                key="edit"
                type="text"
                icon={<EditOutlined />}
                onClick={() => handleEdit(todo)}
              >
                Edit
              </Button>,
              <Button
                key="delete"
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDelete(todo.id)}
              >
                Delete
              </Button>,
            ]}
          >
            <List.Item.Meta
              title={
                <span
                  style={{
                    textDecoration: todo.status === 'completed' ? 'line-through' : undefined,
                  }}
                >
                  {todo.title}
                </span>
              }
              description={todo.description}
            />
          </List.Item>
        )}
      />
      <Modal
        title={editingTodo ? 'Edit Todo' : 'Add Todo'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => setIsModalOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="status" label="Status">
            <Checkbox checked={form.getFieldValue('status') === 'completed'}>Completed</Checkbox>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

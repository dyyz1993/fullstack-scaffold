import { FC } from 'react'
import { Form, Input, Button, Card, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useMerchantStore } from '../stores/merchantStore'

export const LoginPage: FC = () => {
  const navigate = useNavigate()
  const login = useMerchantStore(state => state.login)
  const loading = useMerchantStore(state => state.loading)
  const error = useMerchantStore(state => state.error)

  const handleSubmit = async (values: { username: string; password: string }) => {
    await login(values.username, values.password)

    const { isAuthenticated } = useMerchantStore.getState()
    if (isAuthenticated) {
      message.success('Login successful!')
      navigate('/dashboard', { replace: true })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md" title="Merchant Login">
        <Form onFinish={handleSubmit} layout="vertical" autoComplete="off">
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Please input your username!' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Username" size="large" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your password!' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
          </Form.Item>
          {error && <div className="mb-4 text-red-500 text-sm">{error}</div>}
          <Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={loading}>
              Login
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

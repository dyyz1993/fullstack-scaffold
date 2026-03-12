import { Form, Input, Button, Card, message, Spin } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate, Link } from 'react-router-dom'
import { useAdminStore } from '../stores/adminStore'

interface LoginForm {
  username: string
  password: string
}

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const { login, loading } = useAdminStore()

  const handleSubmit = async (values: LoginForm) => {
    try {
      await login(values.username, values.password)
      message.success('Login successful!')
      navigate('/dashboard')
    } catch (error) {
      message.error((error as Error).message || 'Login failed!')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md" title="Admin Login">
        <Spin spinning={loading}>
          <Form form={form} onFinish={handleSubmit} layout="vertical">
            <Form.Item
              name="username"
              rules={[{ required: true, message: 'Please input username!' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="Username" size="large" />
            </Form.Item>
            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Please input password!' }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" size="large" block loading={loading}>
                Login
              </Button>
            </Form.Item>
            <div className="text-center">
              <span className="text-gray-500">Don't have an account? </span>
              <Link to="/register" className="text-blue-500 hover:underline">
                Register
              </Link>
            </div>
          </Form>
        </Spin>
        <div className="mt-4 text-center text-gray-400 text-sm">Demo: admin / 123456</div>
      </Card>
    </div>
  )
}

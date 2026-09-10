import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Card, Form, Input, Button, Typography, App } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { useTenantStore } from '../stores/tenantStore'

/**
 * 租户控制台登录——平台账号认证 + /tenants/mine 选定成员租户。
 * 无租户归属的账号会被明确拒绝（多租户语义的入口门槛）。
 */
export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const login = useTenantStore(state => state.login)
  const loading = useTenantStore(state => state.loading)
  const [error, setError] = useState<string | null>(null)
  const { message } = App.useApp()

  const onFinish = async (values: { account: string; password: string }) => {
    setError(null)
    const result = await login(values.account, values.password)
    if (!result.ok) {
      setError(result.error ?? 'Login failed')
      return
    }
    if (result.hasTenant) {
      message.success('Welcome back')
      navigate('/dashboard', { replace: true })
      return
    }
    // 认证成功但尚无租户：受邀新用户回跳邀请落地页完成入组
    const from = (location.state as { from?: string } | null)?.from
    if (from && from.startsWith('/invite/')) {
      navigate(from, { replace: true })
    } else {
      setError(
        'Signed in, but this account belongs to no tenant yet. Open your invitation link to join one.'
      )
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gray-100"
      data-testid="tenant-login"
    >
      <Card
        className="w-96 shadow-lg"
        title={<Typography.Title level={4}>Tenant Console</Typography.Title>}
      >
        <Typography.Paragraph type="secondary">
          Sign in with your platform account. Accounts belonging to a tenant will enter that
          tenant's console.
        </Typography.Paragraph>
        <Form layout="vertical" onFinish={onFinish} data-testid="tenant-login-form">
          <Form.Item
            name="account"
            label="Account"
            rules={[{ required: true, message: 'Please input your account' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="username / email" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Please input your password' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="password" />
          </Form.Item>
          {error && (
            <Typography.Paragraph type="danger" data-testid="tenant-login-error">
              {error}
            </Typography.Paragraph>
          )}
          <Button type="primary" htmlType="submit" block loading={loading}>
            Sign in
          </Button>
        </Form>
      </Card>
    </div>
  )
}

import { Form, Input, Button, Card, message, Spin, Divider } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate, Link } from 'react-router-dom'
import { useAdminStore } from '../stores/adminStore'
import { Role } from '@shared/modules/permission'
import type { LoginRequest } from '@shared/modules/admin'
import { useLanguage } from '../i18n/useLanguage'

interface QuickLoginAccount extends LoginRequest {
  username: string
  password: string
  role: Role
  labelKey: string
  color: string
}

export const LoginPage: React.FC = () => {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [form] = Form.useForm<LoginRequest>()
  const { login, loading } = useAdminStore()

  const QUICK_LOGIN_ACCOUNTS: QuickLoginAccount[] = [
    {
      username: 'superadmin',
      password: '123456',
      role: Role.SUPER_ADMIN,
      labelKey: 'login.superAdmin',
      color: 'red',
    },
    {
      username: 'customerservice',
      password: '123456',
      role: Role.CUSTOMER_SERVICE,
      labelKey: 'login.customerService',
      color: 'blue',
    },
    {
      username: 'user1',
      password: '123456',
      role: Role.USER,
      labelKey: 'login.normalUser',
      color: 'green',
    },
  ]

  const handleSubmit = async (values: LoginRequest) => {
    try {
      await login(values.username, values.password)
      message.success(t('login.success'))
      navigate('/dashboard')
    } catch (error) {
      message.error((error as Error).message || t('login.failed'))
    }
  }

  const handleQuickLogin = async (account: QuickLoginAccount) => {
    try {
      await login(account.username, account.password)
      message.success(t('login.quickLoginAs', { role: t(account.labelKey) }))
      navigate('/dashboard')
    } catch (error) {
      message.error((error as Error).message || t('login.failed'))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md" title={t('login.title')}>
        <Spin spinning={loading}>
          <Form
            form={form}
            onFinish={handleSubmit}
            layout="vertical"
            data-testid="admin-login-form"
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: t('login.usernameRequired') }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder={t('login.username')}
                size="large"
                data-testid="admin-login-username"
              />
            </Form.Item>
            <Form.Item
              name="password"
              rules={[{ required: true, message: t('login.passwordRequired') }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={t('login.password')}
                size="large"
                data-testid="admin-login-password"
              />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={loading}
                data-testid="admin-login-submit"
              >
                {t('login.submit')}
              </Button>
            </Form.Item>
            <div className="text-center">
              <span className="text-gray-500">{t('login.noAccount')}</span>
              <Link to="/register" className="text-blue-500 hover:underline">
                {t('login.register')}
              </Link>
            </div>
          </Form>
        </Spin>

        <Divider>{t('login.quickLogin')}</Divider>

        <div className="space-y-2">
          {QUICK_LOGIN_ACCOUNTS.map(account => (
            <Button
              key={account.username}
              block
              size="large"
              onClick={() => handleQuickLogin(account)}
              loading={loading}
              className="flex items-center justify-between"
            >
              <span>{t(account.labelKey)}</span>
              <span className="text-gray-400 text-sm">{account.username}</span>
            </Button>
          ))}
        </div>
      </Card>
    </div>
  )
}

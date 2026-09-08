import { Form, Input, Button, Card, message, Spin } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons'
import { useNavigate, Link } from 'react-router-dom'
import { useState } from 'react'
import { apiClient } from '../services/apiClient'
import type { RegisterRequest } from '@shared/modules/admin'
import { useLanguage } from '../i18n/useLanguage'

interface RegisterForm extends RegisterRequest {
  confirmPassword: string
}

export const RegisterPage: React.FC = () => {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [form] = Form.useForm<RegisterForm>()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (values: RegisterForm) => {
    setLoading(true)
    try {
      const response = await apiClient.api.admin.register.$post({
        json: {
          username: values.username,
          email: values.email,
          password: values.password,
        },
      })
      const result = await response.json()
      if (result.success) {
        message.success(t('register.success'))
        navigate('/login')
      } else {
        message.error(result.error || t('register.failed'))
      }
    } catch (error) {
      message.error((error as Error).message || t('register.failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md" title={t('register.title')}>
        <Spin spinning={loading}>
          <Form form={form} onFinish={handleSubmit} layout="vertical">
            <Form.Item
              name="username"
              rules={[{ required: true, message: t('register.usernameRequired') }]}
            >
              <Input prefix={<UserOutlined />} placeholder={t('register.username')} size="large" />
            </Form.Item>
            <Form.Item
              name="email"
              rules={[{ required: true, type: 'email', message: t('register.emailRequired') }]}
            >
              <Input prefix={<MailOutlined />} placeholder={t('register.email')} size="large" />
            </Form.Item>
            <Form.Item
              name="password"
              rules={[{ required: true, min: 6, message: t('register.passwordMin') }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={t('register.password')}
                size="large"
              />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              dependencies={['password']}
              rules={[
                { required: true, message: t('register.confirmRequired') },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve()
                    }
                    return Promise.reject(new Error(t('register.passwordMismatch')))
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={t('register.confirmPassword')}
                size="large"
              />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" size="large" block loading={loading}>
                {t('register.submit')}
              </Button>
            </Form.Item>
            <div className="text-center">
              <span className="text-gray-500">{t('register.hasAccount')}</span>
              <Link to="/login" className="text-blue-500 hover:underline">
                {t('register.loginLink')}
              </Link>
            </div>
          </Form>
        </Spin>
      </Card>
    </div>
  )
}

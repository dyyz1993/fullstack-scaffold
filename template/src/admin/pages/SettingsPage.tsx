import { useState, useEffect, useCallback } from 'react'
import { Card, Form, Input, Button, Switch, Divider, message, InputNumber } from 'antd'
import { apiClient, api } from '../services/apiClient'
import { useLanguage } from '../i18n/useLanguage'
import type { Settings } from '@shared/modules/admin'

export const SettingsPage: React.FC = () => {
  const { t } = useLanguage()
  const [form] = Form.useForm<Settings>()
  const [loading, setLoading] = useState(false)

  const fetchSettings = useCallback(async () => {
    try {
      const data = await api(apiClient.api.admin.settings.$get())
        .withLoading(t('common.loading'))
        .json()
      form.setFieldsValue(data)
    } catch {
      // handled by api-request
    }
  }, [form, t])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handleSave = async (values: Settings) => {
    setLoading(true)
    try {
      await api(
        apiClient.api.admin.settings.$put({
          json: values,
        })
      )
        .withLoading(t('common.loading'))
        .json()
      message.success(t('settings.saved'))
    } catch {
      // handled by api-request
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('settings.title')}</h1>

      <Form form={form} layout="vertical" onFinish={handleSave}>
        <Card title={t('settings.general')} className="mb-6">
          <Form.Item label={t('settings.siteName')} name="siteName" rules={[{ required: true }]}>
            <Input placeholder={t('settings.siteNamePlaceholder')} />
          </Form.Item>
          <Form.Item label={t('settings.siteDescription')} name="siteDescription">
            <Input.TextArea rows={4} placeholder={t('settings.siteDescriptionPlaceholder')} />
          </Form.Item>
        </Card>

        <Card title={t('settings.email')} className="mb-6">
          <Form.Item label={t('settings.smtpHost')} name="smtpHost" rules={[{ required: true }]}>
            <Input placeholder={t('settings.smtpHostPlaceholder')} />
          </Form.Item>
          <Form.Item label={t('settings.smtpPort')} name="smtpPort" rules={[{ required: true }]}>
            <InputNumber min={1} max={65535} className="w-full" />
          </Form.Item>
          <Form.Item
            label={t('settings.emailFrom')}
            name="emailFrom"
            rules={[{ required: true, type: 'email' }]}
          >
            <Input placeholder={t('settings.emailFromPlaceholder')} />
          </Form.Item>
        </Card>

        <Card title={t('settings.notification')} className="mb-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t('settings.emailNotifications')}</p>
                <p className="text-sm text-gray-500">{t('settings.emailNotificationsDesc')}</p>
              </div>
              <Form.Item name="emailNotifications" valuePropName="checked" noStyle>
                <Switch />
              </Form.Item>
            </div>
            <Divider />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t('settings.pushNotifications')}</p>
                <p className="text-sm text-gray-500">{t('settings.pushNotificationsDesc')}</p>
              </div>
              <Form.Item name="pushNotifications" valuePropName="checked" noStyle>
                <Switch />
              </Form.Item>
            </div>
          </div>
        </Card>

        <Card title={t('settings.security')} className="mb-6">
          <Form.Item
            label={t('settings.sessionTimeout')}
            name="sessionTimeout"
            rules={[{ required: true }]}
          >
            <InputNumber min={5} max={1440} addonAfter={t('settings.minutes')} className="w-full" />
          </Form.Item>
          <Form.Item
            label={t('settings.maxLoginAttempts')}
            name="maxLoginAttempts"
            rules={[{ required: true }]}
          >
            <InputNumber min={1} max={20} className="w-full" />
          </Form.Item>
        </Card>

        <Button type="primary" htmlType="submit" loading={loading} size="large">
          {t('settings.saveChanges')}
        </Button>
      </Form>
    </div>
  )
}

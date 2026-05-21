import { Card, Form, Input, Button, Switch, Divider, message } from 'antd'
import { useLanguage } from '../i18n/useLanguage'

interface SettingsFormValues {
  siteName?: string
  siteDescription?: string
  currentPassword?: string
  newPassword?: string
  confirmPassword?: string
}

export const SettingsPage: React.FC = () => {
  const { t } = useLanguage()
  const [form] = Form.useForm<SettingsFormValues>()

  const handleSave = () => {
    message.success(t('settings.saved'))
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('settings.title')}</h1>

      <Card title={t('settings.general')} className="mb-6">
        <Form form={form} layout="vertical">
          <Form.Item label={t('settings.siteName')} name="siteName">
            <Input placeholder={t('settings.siteNamePlaceholder')} />
          </Form.Item>
          <Form.Item label={t('settings.siteDescription')} name="siteDescription">
            <Input.TextArea rows={4} placeholder={t('settings.siteDescriptionPlaceholder')} />
          </Form.Item>
        </Form>
      </Card>

      <Card title={t('settings.notification')} className="mb-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t('settings.emailNotifications')}</p>
              <p className="text-sm text-gray-500">{t('settings.emailNotificationsDesc')}</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Divider />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t('settings.pushNotifications')}</p>
              <p className="text-sm text-gray-500">{t('settings.pushNotificationsDesc')}</p>
            </div>
            <Switch />
          </div>
        </div>
      </Card>

      <Card title={t('settings.security')}>
        <Form form={form} layout="vertical">
          <Form.Item label={t('settings.currentPassword')} name="currentPassword">
            <Input.Password placeholder={t('settings.currentPasswordPlaceholder')} />
          </Form.Item>
          <Form.Item label={t('settings.newPassword')} name="newPassword">
            <Input.Password placeholder={t('settings.newPasswordPlaceholder')} />
          </Form.Item>
          <Form.Item label={t('settings.confirmNewPassword')} name="confirmPassword">
            <Input.Password placeholder={t('settings.confirmNewPasswordPlaceholder')} />
          </Form.Item>
          <Button type="primary" onClick={handleSave}>
            {t('settings.saveChanges')}
          </Button>
        </Form>
      </Card>
    </div>
  )
}

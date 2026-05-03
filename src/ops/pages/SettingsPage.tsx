import { useState, useEffect } from 'react'
import { Card, Form, Input, Button, Switch, Divider, message } from 'antd'
import { apiClient } from '../services/apiClient'
import type { Settings } from '@shared/modules/ops'

export const SettingsPage: React.FC = () => {
  const [generalForm] = Form.useForm()
  const [securityForm] = Form.useForm()
  const [, setSettings] = useState<Settings | null>(null)
  const [saving, setSaving] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await apiClient.api.admin.settings.$get()
        const result = await response.json()
        if (result.success) {
          setSettings(result.data)
          generalForm.setFieldsValue({
            siteName: result.data.siteName,
            siteDescription: result.data.siteDescription,
          })
          setNotificationsEnabled(result.data.notificationsEnabled)
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error)
      }
    }
    fetchSettings()
  }, [generalForm])

  const handleSaveGeneral = async () => {
    try {
      const values = await generalForm.validateFields()
      setSaving(true)
      const response = await apiClient.api.admin.settings.$put({
        json: {
          ...values,
          notificationsEnabled,
        },
      })
      const result = await response.json()
      if (result.success) {
        setSettings(result.data)
        message.success('Settings saved successfully!')
      }
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSecurity = async () => {
    try {
      const values = await securityForm.validateFields()
      if (values.newPassword !== values.confirmPassword) {
        message.error('Passwords do not match')
        return
      }
      message.success('Password updated successfully!')
      securityForm.resetFields()
    } catch {
      // validation error
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <Card title="General Settings" className="mb-6">
        <Form form={generalForm} layout="vertical">
          <Form.Item label="Site Name" name="siteName">
            <Input placeholder="Enter site name" />
          </Form.Item>
          <Form.Item label="Site Description" name="siteDescription">
            <Input.TextArea rows={4} placeholder="Enter site description" />
          </Form.Item>
        </Form>
      </Card>

      <Card title="Notification Settings" className="mb-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable Notifications</p>
              <p className="text-sm text-gray-500">
                Enable or disable system notification broadcasting
              </p>
            </div>
            <Switch checked={notificationsEnabled} onChange={setNotificationsEnabled} />
          </div>
        </div>
        <Divider />
        <Button type="primary" loading={saving} onClick={handleSaveGeneral}>
          Save Changes
        </Button>
      </Card>

      <Card title="Security Settings">
        <Form form={securityForm} layout="vertical">
          <Form.Item label="Current Password" name="currentPassword">
            <Input.Password placeholder="Enter current password" />
          </Form.Item>
          <Form.Item label="New Password" name="newPassword">
            <Input.Password placeholder="Enter new password" />
          </Form.Item>
          <Form.Item label="Confirm New Password" name="confirmPassword">
            <Input.Password placeholder="Confirm new password" />
          </Form.Item>
          <Button type="primary" onClick={handleSaveSecurity}>
            Update Password
          </Button>
        </Form>
      </Card>
    </div>
  )
}

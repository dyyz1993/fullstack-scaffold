import { useEffect } from 'react'
import { Card, Form, Input, Button, message } from 'antd'
import { SaveOutlined } from '@ant-design/icons'
import { useTenantStore } from '../stores/tenantStore'
import type { UpdateTenantInput } from '@shared/schemas'

export const SettingsPage: React.FC = () => {
  const { currentTenant, loading, updateTenant } = useTenantStore()
  const [form] = Form.useForm()

  useEffect(() => {
    if (currentTenant) {
      form.setFieldsValue({
        name: currentTenant.name,
        slug: currentTenant.slug,
        email: currentTenant.email,
        settings: currentTenant.settings ? JSON.parse(currentTenant.settings) : {},
      })
    }
  }, [currentTenant, form])

  const handleSubmit = async (values: unknown) => {
    if (!currentTenant) {
      message.error('No tenant loaded')
      return
    }

    const updateData: UpdateTenantInput = {
      name: (values as { name: string }).name,
      email: (values as { email: string }).email,
      settings: JSON.stringify((values as { settings: Record<string, unknown> }).settings),
    }

    const success = await updateTenant(currentTenant.id, updateData)
    if (success) {
      message.success('Settings updated successfully')
    }
  }

  return (
    <div data-testid="tenant-settings">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <Card>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Tenant Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="slug" label="Slug" rules={[{ required: true }]}>
            <Input disabled />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name={['settings', 'logoUrl']} label="Logo URL">
            <Input />
          </Form.Item>
          <Form.Item name={['settings', 'primaryColor']} label="Primary Color">
            <Input type="color" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
              Save Settings
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { FC } from 'react'
import { Form, Input, Button, Card, Typography, Upload, message } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import { apiClient } from '@client/services/apiClient'
import type { UploadProps } from 'antd'

const { Title, Text } = Typography

export const SettingsPage: FC = () => {
  const [form] = Form.useForm()

  const handleSave = async (values: unknown) => {
    try {
      await (apiClient as any).api.merchant.settings.$put({ json: values })
      message.success('Settings saved successfully')
    } catch {
      message.error('Failed to save settings')
    }
  }

  const uploadProps: UploadProps = {
    name: 'file',
    action: '/api/merchant/settings/logo',
    beforeUpload: file => {
      const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png'
      if (!isJpgOrPng) {
        message.error('You can only upload JPG/PNG file!')
      }
      const isLt2M = file.size / 1024 / 1024 < 2
      if (!isLt2M) {
        message.error('Image must smaller than 2MB!')
      }
      return isJpgOrPng && isLt2M
    },
    onChange: info => {
      if (info.file.status === 'done') {
        message.success(`${info.file.name} file uploaded successfully`)
      } else if (info.file.status === 'error') {
        message.error(`${info.file.name} file upload failed`)
      }
    },
  }

  return (
    <div>
      <Title level={2}>Settings</Title>
      <Card>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item label="Store Name" name="storeName" rules={[{ required: true }]}>
            <Input placeholder="Enter store name" />
          </Form.Item>

          <Form.Item label="Store Description" name="storeDescription">
            <Input.TextArea rows={4} placeholder="Enter store description" />
          </Form.Item>

          <Form.Item label="Contact Email" name="email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="Enter contact email" />
          </Form.Item>

          <Form.Item label="Phone Number" name="phone">
            <Input placeholder="Enter phone number" />
          </Form.Item>

          <Form.Item label="Address" name="address">
            <Input.TextArea rows={2} placeholder="Enter store address" />
          </Form.Item>

          <Form.Item label="Store Logo">
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />}>Click to Upload</Button>
            </Upload>
            <Text type="secondary">Max 2MB, JPG/PNG only</Text>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              Save Settings
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

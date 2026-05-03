import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Save } from 'lucide-react'
import { Button, Card, Form, Input, message, Spin, Descriptions, Tag, Divider } from 'antd'
import { useTenantStore } from '../stores/tenantStore'
import { tenantApi } from '../services/tenantApi'

const planLabels: Record<string, string> = {
  free: '免费版',
  starter: '入门版',
  pro: '专业版',
  enterprise: '企业版',
}

const planFeatures: Record<string, string[]> = {
  free: ['最多 3 个角色', '最多 10 个成员', '1GB 存储空间'],
  starter: ['最多 5 个角色', '最多 50 个成员', '10GB 存储空间', '优先支持'],
  pro: ['最多 10 个角色', '最多 200 个成员', '100GB 存储空间', '优先支持', 'API 访问'],
  enterprise: ['无限角色', '无限成员', '无限存储', '专属支持', '自定义功能'],
}

export const SettingsPage: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>()
  const { currentTenant, updateTenant } = useTenantStore()
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (currentTenant) {
      form.setFieldsValue({
        name: currentTenant.name,
        description: currentTenant.description,
      })
    }
  }, [currentTenant, form])

  const handleSave = async (values: { name: string; description?: string }) => {
    if (!tenantId) return
    setSaving(true)
    try {
      const updated = await tenantApi.updateTenant(tenantId, values)
      updateTenant(tenantId, updated)
      message.success('设置已保存')
      setEditing(false)
    } catch {
      message.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (!currentTenant) {
    return (
      <div className="flex justify-center py-12">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">租户设置</h1>
          <p className="text-gray-500 mt-1">管理租户的基本信息和配置</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card
            title="基本信息"
            extra={!editing && <Button onClick={() => setEditing(true)}>编辑</Button>}
          >
            {editing ? (
              <Form form={form} layout="vertical" onFinish={handleSave}>
                <Form.Item name="name" label="租户名称" rules={[{ required: true }]}>
                  <Input placeholder="输入租户名称" />
                </Form.Item>
                <Form.Item name="description" label="描述">
                  <Input.TextArea placeholder="输入租户描述" rows={3} />
                </Form.Item>
                <Form.Item className="mb-0">
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={saving}
                    icon={<Save className="w-4 h-4" />}
                  >
                    保存
                  </Button>
                  <Button className="ml-2" onClick={() => setEditing(false)}>
                    取消
                  </Button>
                </Form.Item>
              </Form>
            ) : (
              <Descriptions column={2}>
                <Descriptions.Item label="租户名称">{currentTenant.name}</Descriptions.Item>
                <Descriptions.Item label="租户标识">{currentTenant.slug}</Descriptions.Item>
                <Descriptions.Item label="描述" span={2}>
                  {currentTenant.description || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="创建时间">
                  {currentTenant.createdAt
                    ? new Date(currentTenant.createdAt).toLocaleDateString()
                    : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={currentTenant.status === 'active' ? 'green' : 'default'}>
                    {currentTenant.status}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>
            )}
          </Card>

          <Card title="套餐信息">
            <Descriptions column={2}>
              <Descriptions.Item label="当前套餐">
                <Tag color="blue">{planLabels[currentTenant.plan] || currentTenant.plan}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="成员上限">
                {currentTenant.maxMembers || '无限制'}
              </Descriptions.Item>
              <Descriptions.Item label="存储上限">
                {currentTenant.maxStorage
                  ? `${(currentTenant.maxStorage / 1024 / 1024 / 1024).toFixed(2)} GB`
                  : '无限制'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="套餐功能">
            <div className="space-y-3">
              {planFeatures[currentTenant.plan]?.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
            {currentTenant.plan === 'free' && (
              <>
                <Divider />
                <Button type="primary" block>
                  升级套餐
                </Button>
              </>
            )}
          </Card>

          <Card title="快速链接">
            <div className="space-y-2">
              <Button type="link" block className="text-left">
                查看账单
              </Button>
              <Button type="link" block className="text-left">
                成员管理
              </Button>
              <Button type="link" block className="text-left">
                角色管理
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

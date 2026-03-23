import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, ArrowLeft, Check } from 'lucide-react'
import { Card, Button, Form, Input, message, Steps } from 'antd'
import { useTenantStore } from '../stores/tenantStore'
import { tenantApi } from '../services/tenantApi'

const planFeatures: Record<string, string[]> = {
  free: ['最多 3 个角色', '最多 10 个成员', '1GB 存储空间', '基础支持'],
  starter: ['最多 5 个角色', '最多 50 个成员', '10GB 存储空间', '优先支持', '自定义域名'],
  pro: ['最多 10 个角色', '最多 200 个成员', '100GB 存储空间', '优先支持', 'API 访问', 'SSO 登录'],
  enterprise: [
    '无限角色',
    '无限成员',
    '无限存储',
    '专属支持',
    '自定义功能',
    'SLA 保障',
    '私有部署',
  ],
}

const planLabels: Record<string, string> = {
  free: '免费版',
  starter: '入门版',
  pro: '专业版',
  enterprise: '企业版',
}

const planPrices: Record<string, { monthly: number; yearly: number }> = {
  free: { monthly: 0, yearly: 0 },
  starter: { monthly: 29, yearly: 290 },
  pro: { monthly: 99, yearly: 990 },
  enterprise: { monthly: 299, yearly: 2990 },
}

export const TenantCreatePage: React.FC = () => {
  const navigate = useNavigate()
  const { addTenant, setCurrentTenant } = useTenantStore()
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedPlan, setSelectedPlan] = useState<string>('free')
  const [form] = Form.useForm()

  const handleCreate = async (values: { name: string; slug: string }) => {
    setLoading(true)
    try {
      const tenant = await tenantApi.createTenant({
        name: values.name,
        slug: values.slug,
        plan: selectedPlan as 'free' | 'starter' | 'pro' | 'enterprise',
      })
      addTenant(tenant)
      setCurrentTenant(tenant)
      message.success('租户创建成功')
      navigate(`/tenants/${tenant.id}/members`)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '创建失败')
    } finally {
      setLoading(false)
    }
  }

  const handleNext = () => {
    if (currentStep === 0) {
      form.validateFields().then(() => {
        setCurrentStep(1)
      })
    } else {
      form.validateFields().then(values => {
        handleCreate(values)
      })
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Button
        type="link"
        icon={<ArrowLeft className="w-4 h-4" />}
        onClick={() => navigate('/tenants')}
        className="mb-4"
      >
        返回租户列表
      </Button>

      <Card>
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">创建新租户</h1>
          <p className="text-gray-500 mt-2">创建一个新的工作空间来管理您的团队</p>
        </div>

        <Steps current={currentStep} className="mb-8">
          <Steps.Step title="基本信息" description="填写租户名称" />
          <Steps.Step title="选择套餐" description="选择适合的套餐" />
        </Steps>

        <Form form={form} layout="vertical">
          {currentStep === 0 && (
            <>
              <Form.Item
                name="name"
                label="租户名称"
                rules={[
                  { required: true, message: '请输入租户名称' },
                  { min: 2, message: '名称至少 2 个字符' },
                ]}
              >
                <Input placeholder="例如：我的公司" size="large" />
              </Form.Item>

              <Form.Item
                name="slug"
                label="租户标识"
                rules={[
                  { required: true, message: '请输入租户标识' },
                  { pattern: /^[a-z0-9-]+$/, message: '只能包含小写字母、数字和连字符' },
                  { min: 3, message: '标识至少 3 个字符' },
                ]}
                extra="用于 URL 和唯一标识，创建后不可修改"
              >
                <Input
                  placeholder="例如：my-company"
                  size="large"
                  onChange={e => {
                    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                    form.setFieldValue('slug', value)
                  }}
                />
              </Form.Item>
            </>
          )}

          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="text-sm text-gray-500 mb-4">选择适合您团队的套餐</div>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(planFeatures).map(([plan, features]) => {
                  const price = planPrices[plan]
                  const isSelected = selectedPlan === plan

                  return (
                    <Card
                      key={plan}
                      className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                      onClick={() => setSelectedPlan(plan)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{planLabels[plan]}</span>
                        {isSelected && <Check className="w-5 h-5 text-blue-500" />}
                      </div>
                      <div className="text-2xl font-bold text-gray-900 mb-3">
                        {price.monthly === 0 ? (
                          '免费'
                        ) : (
                          <>
                            ¥{price.monthly}
                            <span className="text-sm text-gray-500">/月</span>
                          </>
                        )}
                      </div>
                      <div className="space-y-1">
                        {features.slice(0, 3).map((feature, index) => (
                          <div key={index} className="text-xs text-gray-500">
                            • {feature}
                          </div>
                        ))}
                        {features.length > 3 && (
                          <div className="text-xs text-gray-400">
                            +{features.length - 3} 更多功能
                          </div>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </Form>

        <div className="flex justify-between mt-8 pt-6 border-t">
          <Button
            onClick={() =>
              currentStep === 0 ? navigate('/tenants') : setCurrentStep(currentStep - 1)
            }
          >
            {currentStep === 0 ? '取消' : '上一步'}
          </Button>
          <Button type="primary" onClick={handleNext} loading={loading}>
            {currentStep === 1 ? '创建租户' : '下一步'}
          </Button>
        </div>
      </Card>
    </div>
  )
}

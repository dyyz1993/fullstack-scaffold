import { useState } from 'react'
import { CreditCard, Check, ArrowUp, Download } from 'lucide-react'
import { Card, Button, Tag, Table, Empty, Modal } from 'antd'
import { useTenantStore } from '../stores/tenantStore'

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

const planFeatures: Record<string, string[]> = {
  free: ['最多 3 个角色', '最多 10 个成员', '1GB 存储空间', '基础支持'],
  starter: ['最多 5 个角色', '最多 50 个成员', '10GB 存储空间', '优先支持'],
  pro: ['最多 10 个角色', '最多 200 个成员', '100GB 存储空间', '优先支持', 'API 访问'],
  enterprise: ['无限角色', '无限成员', '无限存储', '专属支持', '自定义功能', 'SLA 保障'],
}

interface Invoice {
  id: string
  date: string
  amount: number
  status: 'paid' | 'pending' | 'failed'
  plan: string
}

const mockInvoices: Invoice[] = [
  { id: 'INV-001', date: '2024-01-15', amount: 99, status: 'paid', plan: 'pro' },
  { id: 'INV-002', date: '2024-02-15', amount: 99, status: 'paid', plan: 'pro' },
  { id: 'INV-003', date: '2024-03-15', amount: 99, status: 'pending', plan: 'pro' },
]

export const BillingPage: React.FC = () => {
  const { currentTenant } = useTenantStore()
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [billingPeriod] = useState<'monthly' | 'yearly'>('monthly')

  if (!currentTenant) {
    return <Empty description="未找到租户信息" />
  }

  const invoiceColumns = [
    {
      title: '发票号',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: '套餐',
      dataIndex: 'plan',
      key: 'plan',
      render: (plan: string) => <Tag color="blue">{planLabels[plan]}</Tag>,
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => `¥${amount}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: Record<string, string> = { paid: 'green', pending: 'gold', failed: 'red' }
        const labels: Record<string, string> = {
          paid: '已支付',
          pending: '待支付',
          failed: '支付失败',
        }
        return <Tag color={colors[status]}>{labels[status]}</Tag>
      },
    },
    {
      title: '操作',
      key: 'actions',
      render: () => (
        <Button type="link" size="small" icon={<Download className="w-4 h-4" />}>
          下载
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">账单管理</h1>
          <p className="text-gray-500 mt-1">管理订阅和账单</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="当前套餐">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-lg font-medium">{planLabels[currentTenant.plan]}</div>
                  <div className="text-gray-500">
                    {currentTenant.plan === 'free'
                      ? '免费使用'
                      : `¥${planPrices[currentTenant.plan]?.monthly || 0}/月`}
                  </div>
                </div>
              </div>
              {currentTenant.plan !== 'enterprise' && (
                <Button
                  type="primary"
                  icon={<ArrowUp className="w-4 h-4" />}
                  onClick={() => setUpgradeModalOpen(true)}
                >
                  升级套餐
                </Button>
              )}
            </div>
          </Card>
        </div>

        <Card title="用量统计">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>成员</span>
                <span className="text-gray-500">
                  {currentTenant.memberCount || 0} / {currentTenant.maxMembers || '∞'}
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{
                    width: currentTenant.maxMembers
                      ? `${Math.min(((currentTenant.memberCount || 0) / currentTenant.maxMembers) * 100, 100)}%`
                      : '10%',
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>存储</span>
                <span className="text-gray-500">
                  {((currentTenant.usedStorage || 0) / 1024 / 1024).toFixed(2)} MB /{' '}
                  {currentTenant.maxStorage
                    ? `${(currentTenant.maxStorage / 1024 / 1024 / 1024).toFixed(0)} GB`
                    : '∞'}
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{
                    width: currentTenant.maxStorage
                      ? `${Math.min(((currentTenant.usedStorage || 0) / currentTenant.maxStorage) * 100, 100)}%`
                      : '10%',
                  }}
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {currentTenant.plan !== 'free' && (
        <Card title="账单历史">
          <Table
            columns={invoiceColumns}
            dataSource={mockInvoices}
            rowKey="id"
            pagination={false}
          />
        </Card>
      )}

      <Modal
        title="升级套餐"
        open={upgradeModalOpen}
        onCancel={() => setUpgradeModalOpen(false)}
        footer={null}
        width={800}
      >
        <div className="mb-4">
          <div className="flex gap-2 justify-center">
            <Button type="primary">月付</Button>
            <Button>年付 (省 17%)</Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {Object.entries(planFeatures)
            .filter(([key]) => key !== 'free')
            .map(([plan, features]) => {
              const price = planPrices[plan]?.[billingPeriod] || 0
              const isSelected = selectedPlan === plan
              const isCurrent = currentTenant.plan === plan

              return (
                <Card
                  key={plan}
                  className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-blue-500' : ''} ${isCurrent ? 'opacity-50' : ''}`}
                  onClick={() => !isCurrent && setSelectedPlan(plan)}
                >
                  <div className="text-center mb-4">
                    <div className="text-lg font-bold">{planLabels[plan]}</div>
                    <div className="text-3xl font-bold text-blue-600">
                      ¥{price}
                      <span className="text-sm text-gray-400">
                        /{billingPeriod === 'monthly' ? '月' : '年'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                  {isCurrent && (
                    <div className="mt-4 text-center">
                      <Tag color="blue">当前套餐</Tag>
                    </div>
                  )}
                </Card>
              )
            })}
        </div>

        <div className="mt-6 text-right">
          <Button onClick={() => setUpgradeModalOpen(false)}>取消</Button>
          <Button type="primary" className="ml-2" disabled={!selectedPlan}>
            确认升级
          </Button>
        </div>
      </Modal>
    </div>
  )
}

import { useEffect } from 'react'
import { Card, Descriptions, Button, message } from 'antd'
import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { useTenantStore } from '../stores/tenantStore'

export const SubscriptionPage: React.FC = () => {
  const { subscription, loading, fetchSubscription } = useTenantStore()

  useEffect(() => {
    fetchSubscription()
  }, [fetchSubscription])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />
      case 'pending':
        return <ClockCircleOutlined style={{ color: '#faad14' }} />
      case 'cancelled':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
      default:
        return null
    }
  }

  const handleUpgrade = () => {
    message.success('Upgrade feature coming soon!')
  }

  const handleCancel = () => {
    message.success('Cancel subscription feature coming soon!')
  }

  if (loading) {
    return <div>Loading subscription...</div>
  }

  const subData = subscription as {
    plan?: string
    status?: string
    startDate?: string
    endDate?: string
    usersLimit?: number
    storageLimit?: string
    features?: string[]
  }

  return (
    <div data-testid="tenant-subscription">
      <h1 className="text-2xl font-bold mb-6">Subscription</h1>
      <Card>
        <Descriptions title={subData?.plan || 'No Plan'} bordered>
          <Descriptions.Item label="Status">
            {subData?.status ? (
              <span>
                {getStatusIcon(subData.status)} {subData.status}
              </span>
            ) : (
              'No subscription'
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Start Date">{subData?.startDate || '-'}</Descriptions.Item>
          <Descriptions.Item label="End Date">{subData?.endDate || '-'}</Descriptions.Item>
          <Descriptions.Item label="Users Limit">{subData?.usersLimit || '-'}</Descriptions.Item>
          <Descriptions.Item label="Storage Limit">
            {subData?.storageLimit || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Features">
            {subData?.features?.join(', ') || 'None'}
          </Descriptions.Item>
        </Descriptions>
        <div className="mt-6 flex gap-4">
          <Button type="primary" onClick={handleUpgrade}>
            Upgrade Plan
          </Button>
          <Button danger onClick={handleCancel}>
            Cancel Subscription
          </Button>
        </div>
      </Card>
    </div>
  )
}

import { useEffect } from 'react'
import { Card, Descriptions, Progress, Button, Typography, Tooltip } from 'antd'
import { useTenantStore } from '../stores/tenantStore'

/**
 * 订阅/配额页——全部真实数据：plan/maxUsers 来自租户记录，
 * 成员用量来自 members 接口；配额在邀请与接受两处服务端真实拦截。
 * 套餐变更走平台管理员（ tenants 属平台管理域），此处按钮以提示代替假动作。
 */
export const SubscriptionPage: React.FC = () => {
  const { subscription, loading, fetchSubscription } = useTenantStore()

  useEffect(() => {
    fetchSubscription()
  }, [fetchSubscription])

  if (loading && !subscription) {
    return <div>Loading subscription...</div>
  }

  if (!subscription) {
    return <div>No subscription data</div>
  }

  const { plan, maxUsers, currentUsers } = subscription
  const percent = maxUsers > 0 ? Math.round((currentUsers / maxUsers) * 100) : 0

  return (
    <div data-testid="tenant-subscription">
      <h1 className="text-2xl font-bold mb-6">Subscription</h1>
      <Card>
        <Descriptions title={plan.toUpperCase()} bordered>
          <Descriptions.Item label="Plan">{plan}</Descriptions.Item>
          <Descriptions.Item label="Members">
            {currentUsers} / {maxUsers}
          </Descriptions.Item>
          <Descriptions.Item label="Custom role limit">
            {{ free: 3, starter: 5, pro: 10, enterprise: 'Unlimited' }[plan] ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <div className="mt-6">
          <Typography.Paragraph strong>Member quota usage</Typography.Paragraph>
          <Progress percent={percent} status={percent >= 100 ? 'exception' : 'normal'} />
          {percent >= 100 && (
            <Typography.Paragraph type="danger">
              Quota is full — new invitations will be rejected until the plan is upgraded.
            </Typography.Paragraph>
          )}
        </div>
        <div className="mt-6 flex gap-4">
          <Tooltip title="Plan changes are managed by the platform administrator">
            <Button type="primary" disabled>
              Upgrade Plan
            </Button>
          </Tooltip>
        </div>
      </Card>
    </div>
  )
}

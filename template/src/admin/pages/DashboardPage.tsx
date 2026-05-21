import { useEffect, useState } from 'react'
import { Button, Select, message, theme } from 'antd'
import { Activity, CheckCircle, Clock, TrendingUp, BellRing } from 'lucide-react'
import { apiClient } from '../services/apiClient'
import { useLanguage } from '../i18n/useLanguage'
import type { SystemStats } from '@shared/modules/admin'
import type { NotificationType } from '@shared/schemas'

export const DashboardPage: React.FC = () => {
  const { t } = useLanguage()
  const { token } = theme.useToken()
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [sendingNotification, setSendingNotification] = useState(false)
  const [notificationType, setNotificationType] = useState<NotificationType>('info')

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await apiClient.api.admin.stats.$get()
        const result = await response.json()
        if (result.success) {
          setStats(result.data)
        }
      } catch {
        message.error(t('dashboard.loadFailed'))
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [t])

  if (loading) {
    return (
      <div className="p-5" style={{ color: token.colorText }}>
        {t('common.loading')}
      </div>
    )
  }

  const statCards = [
    {
      title: t('dashboard.totalTodos'),
      value: stats?.totalTodos || 0,
      icon: CheckCircle,
      color: 'bg-blue-500',
    },
    {
      title: t('dashboard.pending'),
      value: stats?.pendingTodos || 0,
      icon: Clock,
      color: 'bg-yellow-500',
    },
    {
      title: t('dashboard.completed'),
      value: stats?.completedTodos || 0,
      icon: TrendingUp,
      color: 'bg-green-500',
    },
    {
      title: t('dashboard.lastUpdated'),
      value: stats?.lastUpdated || '-',
      icon: Activity,
      color: 'bg-purple-500',
    },
  ]

  const notificationTypeOptions: { value: NotificationType; label: string }[] = [
    { value: 'info', label: t('dashboard.notificationInfo') },
    { value: 'success', label: t('dashboard.notificationSuccess') },
    { value: 'warning', label: t('dashboard.notificationWarning') },
    { value: 'error', label: t('dashboard.notificationError') },
  ]

  const handleSendTest = async () => {
    setSendingNotification(true)
    try {
      const response = await apiClient.api.admin.notifications.test.$post({
        json: { type: notificationType },
      })
      const result = await response.json()
      if (result.success) {
        message.success(t('dashboard.sent', { type: notificationType }))
      } else {
        message.error(t('dashboard.sendFailed'))
      }
    } catch {
      message.error(t('dashboard.sendFailed'))
    } finally {
      setSendingNotification(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4" style={{ color: token.colorText }}>
        {t('dashboard.title')}
      </h1>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {statCards.map((card, index) => {
          const Icon = card.icon
          return (
            <div
              key={index}
              className="rounded-lg p-6"
              style={{
                backgroundColor: token.colorBgContainer,
                boxShadow: `0 1px 3px ${token.colorBorderSecondary}`,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`p-3 rounded-md ${card.color} w-10 h-10 flex items-center justify-center`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-sm font-medium" style={{ color: token.colorTextSecondary }}>
                {card.title}
              </h3>
              <p className="text-2xl font-bold mt-1" style={{ color: token.colorText }}>
                {card.value}
              </p>
            </div>
          )
        })}
      </div>

      <div
        className="rounded-lg p-6"
        style={{
          backgroundColor: token.colorBgContainer,
          boxShadow: `0 1px 3px ${token.colorBorderSecondary}`,
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <BellRing className="w-5 h-5" style={{ color: token.colorTextSecondary }} />
          <h2 className="text-base font-semibold" style={{ color: token.colorText }}>
            {t('dashboard.testNotification')}
          </h2>
        </div>
        <p className="text-sm mb-4" style={{ color: token.colorTextSecondary }}>
          {t('dashboard.testNotificationDesc')}
        </p>
        <div className="flex gap-2">
          <Select
            value={notificationType}
            onChange={setNotificationType}
            style={{ width: 120 }}
            options={notificationTypeOptions}
          />
          <Button type="primary" loading={sendingNotification} onClick={handleSendTest}>
            {t('dashboard.sendTest')}
          </Button>
        </div>
      </div>
    </div>
  )
}

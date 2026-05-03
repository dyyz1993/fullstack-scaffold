import { useEffect, useState } from 'react'
import { apiClient } from '../services/apiClient'
import type { SystemStats, TodoDailyCount } from '@shared/modules/ops'
import type { NotificationType } from '@shared/schemas'
import { Activity, CheckCircle, Clock, TrendingUp, Bell, BellRing } from 'lucide-react'
import { Button, Select, Skeleton, Card } from 'antd'
import { useMessage } from '../hooks/useAntdStatic'

export const DashboardPage: React.FC = () => {
  const message = useMessage()
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [sendingNotification, setSendingNotification] = useState(false)
  const [notificationType, setNotificationType] = useState<NotificationType>('info')
  const [dailyCounts, setDailyCounts] = useState<TodoDailyCount[]>([])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await apiClient.api.admin.stats.$get()
        const result = await response.json()
        if (result.success) {
          setStats(result.data)
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }

    const fetchDailyCounts = async () => {
      try {
        const response = await apiClient.api.admin.stats.daily.$get()
        const result = await response.json()
        if (result.success) {
          setDailyCounts(result.data)
        }
      } catch {
        // ignore
      }
    }

    fetchStats()
    fetchDailyCounts()
  }, [])

  const handleSendTestNotification = async () => {
    setSendingNotification(true)
    try {
      const response = await apiClient.api.admin.notifications.test.$post({
        json: { type: notificationType },
      })
      const result = await response.json()
      if (result.success) {
        message.success(`测试通知已发送 (${notificationType})`)
      } else {
        message.error('发送失败')
      }
    } catch (error) {
      console.error('Failed to send test notification:', error)
      message.error('发送失败')
    } finally {
      setSendingNotification(false)
    }
  }

  if (loading) {
    return (
      <div>
        <Skeleton.Input active style={{ width: 200, height: 32, marginBottom: 24 }} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <Skeleton active paragraph={{ rows: 2 }} />
            </Card>
          ))}
        </div>
        <Card>
          <Skeleton active paragraph={{ rows: 3 }} />
        </Card>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Todos',
      value: stats?.totalTodos || 0,
      icon: CheckCircle,
      color: 'bg-blue-500',
    },
    {
      title: 'Pending',
      value: stats?.pendingTodos || 0,
      icon: Clock,
      color: 'bg-yellow-500',
    },
    {
      title: 'Completed',
      value: stats?.completedTodos || 0,
      icon: TrendingUp,
      color: 'bg-green-500',
    },
    {
      title: 'Last Updated',
      value: stats?.lastUpdated ? new Date(stats.lastUpdated).toLocaleString('zh-CN') : '-',
      icon: Activity,
      color: 'bg-purple-500',
    },
  ]

  const maxCount = Math.max(...dailyCounts.map(d => d.count), 1)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => {
          const Icon = card.icon
          return (
            <div key={index} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${card.color}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-500">{card.title}</h3>
              <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
            </div>
          )
        })}
      </div>

      {dailyCounts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">最近 7 天 Todo 创建趋势</h2>
          <div className="flex items-end gap-3" style={{ height: 180 }}>
            {dailyCounts.map(item => {
              const height = Math.max((item.count / maxCount) * 140, 4)
              const label = item.date.slice(5)
              return (
                <div key={item.date} className="flex-1 flex flex-col items-center">
                  <span className="text-xs text-gray-500 mb-1">{item.count}</span>
                  <div
                    className="w-full bg-blue-400 rounded-t transition-all hover:bg-blue-500"
                    style={{ height }}
                  />
                  <span className="text-xs text-gray-400 mt-2">{label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <BellRing className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">测试通知功能</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          发送测试通知到所有已连接的客户端。error 和 warning 类型的通知会弹出 antd
          notification，info 和 success 类型只会出现在铃铛列表中。
        </p>
        <div className="flex items-center gap-4">
          <Select
            value={notificationType}
            onChange={setNotificationType}
            style={{ width: 120 }}
            options={[
              { value: 'info', label: 'Info' },
              { value: 'success', label: 'Success' },
              { value: 'warning', label: 'Warning' },
              { value: 'error', label: 'Error' },
            ]}
          />
          <Button
            type="primary"
            icon={<Bell className="w-4 h-4" />}
            loading={sendingNotification}
            onClick={handleSendTestNotification}
          >
            发送测试通知
          </Button>
        </div>
      </div>
    </div>
  )
}

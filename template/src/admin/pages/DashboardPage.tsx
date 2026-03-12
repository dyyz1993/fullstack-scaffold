import { useEffect, useState } from 'react'
import { apiClient } from '../services/apiClient'
import type { SystemStats } from '@shared/modules/admin'
import { Activity, CheckCircle, Clock, TrendingUp } from 'lucide-react'

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)

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

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
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
      value: stats?.lastUpdated || '-',
      icon: Activity,
      color: 'bg-purple-500',
    },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
    </div>
  )
}

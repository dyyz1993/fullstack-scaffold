import { useState, useEffect } from 'react'
import { Card, Spin } from 'antd'
import { apiClient } from '../services/apiClient'
import { useMessage } from '../hooks/useAntdStatic'
import type { MonitorData } from '@shared/modules/ops'
import { StatsCard } from '../components'
import { Clock, Database, Activity, Zap, Server } from 'lucide-react'
import React from 'react'

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  parts.push(`${mins}m`)
  return parts.join(' ')
}

export const MonitorPage: React.FC = () => {
  const message = useMessage()
  const [data, setData] = useState<MonitorData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchMonitor = async () => {
    try {
      const response = await apiClient.api.admin.monitor.$get()
      const result = await response.json()
      if (result.success) {
        setData(result.data)
      }
    } catch {
      message.error('获取监控数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMonitor()
    const timer = setInterval(fetchMonitor, 30000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
      </div>
    )
  }

  if (!data) return null

  const dbColor = data.database === 'connected' ? 'text-green-500' : 'text-red-500'

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">系统监控</h1>
        <span className="text-sm text-gray-500">
          自动刷新: 30s | 上次更新: {new Date(data.timestamp).toLocaleString('zh-CN')}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <StatsCard
          title="服务状态"
          value={data.status === 'ok' ? 1 : 0}
          prefix={<Server className="w-5 h-5" />}
          suffix={data.status === 'ok' ? '正常' : '异常'}
        />
        <StatsCard
          title="运行时间"
          value={0}
          prefix={<Clock className="w-5 h-5" />}
          suffix={formatUptime(data.uptime)}
        />
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">
              <Database className="w-4 h-4 inline mr-1" />
              数据库状态
            </span>
          </div>
          <p className={`text-2xl font-bold ${dbColor}`}>
            {data.database === 'connected' ? '已连接' : '断开'}
          </p>
        </div>
      </div>

      <Card title="内存使用 (MB)" className="mb-6">
        <div className="space-y-4">
          {[
            { label: 'RSS', value: data.memory.rss },
            { label: 'Heap Total', value: data.memory.heapTotal },
            { label: 'Heap Used', value: data.memory.heapUsed },
            { label: 'External', value: data.memory.external },
          ].map(item => {
            const max = data.memory.heapTotal || 1
            const percent = Math.min((item.value / max) * 100, 100)
            return (
              <div key={item.label}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-600">{item.label}</span>
                  <span className="text-sm font-medium">{item.value} MB</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {data.requestCount24h !== undefined && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatsCard
            title="24h 请求数"
            value={data.requestCount24h ?? 0}
            prefix={<Activity className="w-5 h-5" />}
          />
          <StatsCard
            title="平均响应时间"
            value={data.avgResponseTime ?? 0}
            prefix={<Zap className="w-5 h-5" />}
            suffix="ms"
          />
        </div>
      )}
    </div>
  )
}

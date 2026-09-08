import { useEffect } from 'react'
import { Card, Row, Col, Statistic } from 'antd'
import {
  UserOutlined,
  CheckSquareOutlined,
  FileTextOutlined,
  DollarOutlined,
} from '@ant-design/icons'
import { useTenantStore } from '../stores/tenantStore'

export const DashboardPage: React.FC = () => {
  const { stats, fetchStats } = useTenantStore()

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return (
    <div data-testid="tenant-dashboard">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Users"
              value={stats.totalUsers}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Todos"
              value={stats.activeTodos}
              prefix={<CheckSquareOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Content Items"
              value={stats.contentCount}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Monthly Revenue"
              value={stats.monthlyRevenue}
              prefix={<DollarOutlined />}
              precision={2}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

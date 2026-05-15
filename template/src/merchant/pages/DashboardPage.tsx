import { useEffect, FC } from 'react'
import { Row, Col, Card, Statistic } from 'antd'
import { DollarOutlined, ShoppingCartOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { useMerchantStore } from '../stores/merchantStore'

export const DashboardPage: FC = () => {
  const { stats, fetchStats } = useMerchantStore()

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return (
    <div>
      <h2>Merchant Dashboard</h2>
      <Row gutter={16}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Total Sales"
              prefix={<DollarOutlined />}
              value={stats?.totalSales || 0}
              precision={2}
              suffix="$"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Total Orders"
              prefix={<ShoppingCartOutlined />}
              value={stats?.totalOrders || 0}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Pending Orders"
              prefix={<ClockCircleOutlined />}
              value={stats?.pendingOrders || 0}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

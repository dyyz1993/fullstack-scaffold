import { FC, useState, useEffect } from 'react'
import { Select, Space, DatePicker, Button } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import type { Order } from '@shared/schemas'
import { OrderTable } from '../components/OrderTable'

const { RangePicker } = DatePicker

export const OrdersPage: FC = () => {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const setStatusFilter = useState<string>('all')[1]
  const setDateRange = useState<[Date, Date] | null>(null)[1]

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/merchant/orders')
      const result = (await response.json()) as { success?: boolean; data?: Order[] }
      if (result.success === true && result.data) {
        setOrders(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = (value: string) => {
    setStatusFilter(value)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Ant Design RangePicker types are complex
  const handleDateRangeChange = (dates: any) => {
    setDateRange(dates)
  }

  const handleSearch = () => {
    fetchOrders()
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  return (
    <div>
      <h2>Orders</h2>
      <Space style={{ marginBottom: 16 }} size="middle">
        <Select
          defaultValue="all"
          style={{ width: 120 }}
          onChange={handleStatusChange}
          options={[
            { value: 'all', label: 'All Status' },
            { value: 'pending', label: 'Pending' },
            { value: 'processing', label: 'Processing' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
        />
        <RangePicker onChange={handleDateRangeChange} />
        <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
          Search
        </Button>
      </Space>
      <OrderTable orders={orders} loading={loading} />
    </div>
  )
}

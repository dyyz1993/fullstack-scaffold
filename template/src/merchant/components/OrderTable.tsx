import { FC } from 'react'
import { Table, Tag, Space, Button } from 'antd'
import type { Order } from '@shared/schemas'

interface OrderTableProps {
  orders: Order[]
  loading: boolean
}

export const OrderTable: FC<OrderTableProps> = ({ orders, loading }) => {
  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      pending: 'blue',
      processing: 'orange',
      completed: 'green',
      cancelled: 'red',
    }
    return colors[status] || 'default'
  }

  const columns = [
    {
      title: 'Order ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: 'Customer ID',
      dataIndex: 'customerId',
      key: 'customerId',
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount: number) => `$${amount.toFixed(2)}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag color={getStatusColor(status)}>{status}</Tag>,
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Order) => (
        <Space size="middle">
          <Button type="link">View Details</Button>
          {record.status === 'pending' && (
            <Button type="primary" size="small">
              Process
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return <Table dataSource={orders} columns={columns} loading={loading} rowKey="id" />
}

import { FC, useState, useEffect } from 'react'
import { Table, Tag, Button, Space, Typography, Descriptions } from 'antd'
import { EyeOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons'
import type { Dispute, DisputeStatus } from '@shared/schemas'

const { Text } = Typography

export const DisputesPage: FC = () => {
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null)
  const setShowModal = useState(false)[1]

  const fetchDisputes = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/merchant/disputes')
      const result = await response.json()
      if (result.success) {
        setDisputes(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch disputes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleView = (dispute: Dispute) => {
    setSelectedDispute(dispute)
    setShowModal(true)
  }

  const handleResolve = async (disputeId: number) => {
    try {
      await fetch(`/api/merchant/disputes/${disputeId}/resolve`, {
        method: 'POST',
      })
      fetchDisputes()
    } catch (error) {
      console.error('Failed to resolve dispute:', error)
    }
  }

  const handleClose = async (disputeId: number) => {
    try {
      await fetch(`/api/merchant/disputes/${disputeId}/close`, {
        method: 'POST',
      })
      fetchDisputes()
    } catch (error) {
      console.error('Failed to close dispute:', error)
    }
  }

  useEffect(() => {
    fetchDisputes()
  }, [])

  const getStatusColor = (status: DisputeStatus): string => {
    const colors: Record<DisputeStatus, string> = {
      open: 'blue',
      investigating: 'orange',
      resolved: 'green',
      closed: 'red',
    }
    return colors[status] || 'default'
  }

  const columns = [
    {
      title: 'Order ID',
      dataIndex: 'orderId',
      key: 'orderId',
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: DisputeStatus) => <Tag color={getStatusColor(status)}>{status}</Tag>,
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
      render: (_: unknown, record: Dispute) => (
        <Space size="middle">
          <Button type="link" icon={<EyeOutlined />} onClick={() => handleView(record)}>
            View
          </Button>
          {record.status === 'open' && (
            <>
              <Button type="link" icon={<CheckOutlined />} onClick={() => handleResolve(record.id)}>
                Resolve
              </Button>
              <Button
                type="link"
                danger
                icon={<CloseOutlined />}
                onClick={() => handleClose(record.id)}
              >
                Close
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <h2>Disputes</h2>
      <Table dataSource={disputes} columns={columns} loading={loading} rowKey="id" />

      {selectedDispute && (
        <div style={{ marginTop: 16 }}>
          <h3>Dispute Details</h3>
          <Descriptions bordered>
            <Descriptions.Item label="Order ID">{selectedDispute.orderId}</Descriptions.Item>
            <Descriptions.Item label="Reason">{selectedDispute.reason}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={getStatusColor(selectedDispute.status)}>{selectedDispute.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Description" span={3}>
              <Text>{selectedDispute.description}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Created At">
              {new Date(selectedDispute.createdAt).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="Updated At">
              {new Date(selectedDispute.updatedAt).toLocaleString()}
            </Descriptions.Item>
          </Descriptions>
        </div>
      )}
    </div>
  )
}

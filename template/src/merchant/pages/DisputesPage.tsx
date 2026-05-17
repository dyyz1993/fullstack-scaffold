import { FC, useState, useEffect, useCallback } from 'react'
import { Table, Tag, Button, Space, Typography, Descriptions } from 'antd'
import { EyeOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { apiClient } from '@client/services/apiClient'
import type { Dispute, DisputeStatus } from '@shared/schemas'

const { Text } = Typography

export const DisputesPage: FC = () => {
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null)
  const setShowModal = useState(false)[1]

  const fetchDisputes = useCallback(async () => {
    setLoading(true)
    try {
       
      // @ts-expect-error - Hono type inference depth limit in full template; resolves correctly in generated project
      const response = await apiClient.api.merchant.disputes.$get()
      const result = await response.json()
      if (result.success === true && result.data) {
        setDisputes(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch disputes:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleView = (dispute: Dispute) => {
    setSelectedDispute(dispute)
    setShowModal(true)
  }

  const handleResolve = async (disputeId: string) => {
    try {
       
      // @ts-expect-error - Hono type inference depth limit in full template; resolves correctly in generated project
      await apiClient.api.merchant.disputes[':id'].resolve.$post({ param: { id: disputeId } })
      fetchDisputes()
    } catch (error) {
      console.error('Failed to resolve dispute:', error)
    }
  }

  const handleClose = async (disputeId: string) => {
    try {
       
      // @ts-expect-error - Hono type inference depth limit in full template; resolves correctly in generated project
      await apiClient.api.merchant.disputes[':id'].close.$post({ param: { id: disputeId } })
      fetchDisputes()
    } catch (error) {
      console.error('Failed to close dispute:', error)
    }
  }

  useEffect(() => {
    fetchDisputes()
  }, [fetchDisputes])

  const getStatusColor = (status: DisputeStatus): string => {
    const colors: Record<DisputeStatus, string> = {
      pending: 'blue',
      investigating: 'orange',
      resolved: 'green',
      rejected: 'red',
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
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
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
          {record.status === 'pending' && (
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
            <Descriptions.Item label="Type">{selectedDispute.type}</Descriptions.Item>
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

import { useState, useEffect, useCallback } from 'react'
import { Table, Card, Tag, Button, Space, Modal, Select, message, Descriptions } from 'antd'
import { Eye, CheckCircle, XCircle, Clock, DollarSign } from 'lucide-react'
import { PermissionGuard } from '../components/PermissionGuard'
import { Permission } from '@shared/modules/permission'
import { apiClient } from '../services/apiClient'
import type { Order } from '@shared/modules/order'
import { useLanguage } from '../i18n/useLanguage'

export const OrdersPage: React.FC = () => {
  const { t, formatDate } = useLanguage()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string | undefined>()

  const STATUS_COLORS: Record<string, string> = {
    pending: 'orange',
    processing: 'blue',
    completed: 'green',
    cancelled: 'red',
    disputed: 'purple',
  }

  const getLabel = (status: string) => {
    const map: Record<string, string> = {
      pending: t('orders.pending'),
      processing: t('orders.processing'),
      completed: t('orders.completed'),
      cancelled: t('orders.cancelled'),
      disputed: t('orders.disputed'),
    }
    return map[status] || status
  }

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus) params.append('status', filterStatus)

      const response = await apiClient.api.orders.$get({
        query: Object.fromEntries(params),
      })
      const result = await response.json()
      if (result.success) {
        setOrders(result.data)
      } else {
        message.error(result.error || t('orders.loadFailed'))
      }
    } catch {
      message.error(t('orders.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [filterStatus, t])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleProcess = async (orderId: string) => {
    try {
      const response = await apiClient.api.orders[':id'].process.$put({
        param: { id: orderId },
      })
      const result = await response.json()
      if (result.success) {
        message.success(t('orders.orderProcessed'))
        fetchOrders()
      }
    } catch {
      message.error(t('orders.processFailed'))
    }
  }

  const handleCancel = async (orderId: string) => {
    Modal.confirm({
      title: t('orders.confirmCancel'),
      content: t('orders.confirmCancelContent'),
      onOk: async () => {
        try {
          const response = await apiClient.api.orders[':id'].cancel.$put({
            param: { id: orderId },
          })
          const result = await response.json()
          if (result.success) {
            message.success(t('orders.orderCancelled'))
            fetchOrders()
          }
        } catch {
          message.error(t('orders.cancelFailed'))
        }
      },
    })
  }

  const showDetail = (order: Order) => {
    setSelectedOrder(order)
    setDetailVisible(true)
  }

  const columns = [
    {
      title: t('orders.orderNo'),
      dataIndex: 'orderNo',
      key: 'orderNo',
      render: (text: string) => <code className="text-sm">{text}</code>,
    },
    {
      title: t('orders.customer'),
      key: 'customer',
      render: (_: unknown, record: Order) => (
        <div>
          <div className="font-medium">{record.customerName}</div>
          <div className="text-sm text-gray-500">{record.customerEmail}</div>
        </div>
      ),
    },
    {
      title: t('orders.product'),
      dataIndex: 'productName',
      key: 'productName',
    },
    {
      title: t('orders.amount'),
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => (
        <span className="font-medium text-green-600">¥{amount.toFixed(2)}</span>
      ),
    },
    {
      title: t('orders.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag color={STATUS_COLORS[status]}>{getLabel(status)}</Tag>,
    },
    {
      title: t('common.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => formatDate(date),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      render: (_: unknown, record: Order) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<Eye className="w-4 h-4" />}
            onClick={() => showDetail(record)}
          >
            {t('common.view')}
          </Button>
          <PermissionGuard permission={Permission.ORDER_PROCESS}>
            {record.status === 'pending' && (
              <Button
                type="link"
                size="small"
                icon={<CheckCircle className="w-4 h-4" />}
                onClick={() => handleProcess(record.id)}
              >
                {t('orders.process')}
              </Button>
            )}
            {(record.status === 'pending' || record.status === 'processing') && (
              <Button
                type="link"
                size="small"
                danger
                icon={<XCircle className="w-4 h-4" />}
                onClick={() => handleCancel(record.id)}
              >
                {t('orders.cancelOrder')}
              </Button>
            )}
          </PermissionGuard>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('orders.title')}</h1>
          <p className="text-gray-600 mt-1">{t('orders.subtitle')}</p>
        </div>
        <Space>
          <Select
            placeholder={t('orders.filterStatus')}
            style={{ width: 150 }}
            allowClear
            value={filterStatus}
            onChange={setFilterStatus}
            options={[
              { value: 'pending', label: t('orders.pending') },
              { value: 'processing', label: t('orders.processing') },
              { value: 'completed', label: t('orders.completed') },
              { value: 'cancelled', label: t('orders.cancelled') },
              { value: 'disputed', label: t('orders.disputed') },
            ]}
          />
          <Button onClick={fetchOrders}>{t('common.refresh')}</Button>
        </Space>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">{t('orders.totalOrders')}</div>
              <div className="text-2xl font-bold">{orders.length}</div>
            </div>
            <DollarSign className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">{t('orders.pending')}</div>
              <div className="text-2xl font-bold text-orange-500">
                {orders.filter(o => o.status === 'pending').length}
              </div>
            </div>
            <Clock className="w-8 h-8 text-orange-500" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">{t('orders.processing')}</div>
              <div className="text-2xl font-bold text-blue-500">
                {orders.filter(o => o.status === 'processing').length}
              </div>
            </div>
            <Clock className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">{t('orders.completed')}</div>
              <div className="text-2xl font-bold text-green-500">
                {orders.filter(o => o.status === 'completed').length}
              </div>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </Card>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={orders}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: total => t('common.total', { count: total }),
          }}
        />
      </Card>

      <Modal
        title={t('orders.detail')}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={600}
      >
        {selectedOrder && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label={t('orders.orderNo')}>
              <code>{selectedOrder.orderNo}</code>
            </Descriptions.Item>
            <Descriptions.Item label={t('orders.customerName')}>
              {selectedOrder.customerName}
            </Descriptions.Item>
            <Descriptions.Item label={t('orders.customerEmail')}>
              {selectedOrder.customerEmail}
            </Descriptions.Item>
            <Descriptions.Item label={t('orders.productName')}>
              {selectedOrder.productName}
            </Descriptions.Item>
            <Descriptions.Item label={t('orders.orderAmount')}>
              <span className="text-lg font-bold text-green-600">
                ¥{selectedOrder.amount.toFixed(2)}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label={t('orders.orderStatus')}>
              <Tag color={STATUS_COLORS[selectedOrder.status]}>
                {getLabel(selectedOrder.status)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('common.createdAt')}>
              {formatDate(selectedOrder.createdAt)}
            </Descriptions.Item>
            <Descriptions.Item label={t('orders.updatedAt')}>
              {formatDate(selectedOrder.updatedAt)}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}

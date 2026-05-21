import { useState, useEffect, useCallback } from 'react'
import { Table, Card, Tag, Button, Space, Modal, message, Descriptions } from 'antd'
import { Eye, AlertTriangle, CheckCircle } from 'lucide-react'
import { PermissionGuard } from '../components/PermissionGuard'
import { Permission } from '@shared/modules/permission'
import { apiClient } from '../services/apiClient'
import type { Dispute } from '@shared/modules/dispute'
import { useLanguage } from '../i18n/useLanguage'

const STATUS_COLORS: Record<string, string> = {
  pending: 'orange',
  investigating: 'blue',
  resolved: 'green',
  rejected: 'red',
}

export const DisputesPage: React.FC = () => {
  const { t, formatDate } = useLanguage()
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      refund: t('disputes.typeRefund'),
      product_quality: t('disputes.typeProductQuality'),
      service_quality: t('disputes.typeServiceQuality'),
      delivery: t('disputes.typeDelivery'),
      other: t('disputes.typeOther'),
    }
    return map[type] || type
  }

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending: t('disputes.statusPending'),
      investigating: t('disputes.statusInvestigating'),
      resolved: t('disputes.statusResolved'),
      rejected: t('disputes.statusRejected'),
    }
    return map[status] || status
  }

  const fetchDisputes = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiClient.api.disputes.$get({ query: {} })
      const result = await response.json()
      if (result.success) {
        setDisputes(result.data)
      } else {
        message.error(result.error || t('disputes.loadFailed'))
      }
    } catch {
      message.error(t('disputes.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchDisputes()
  }, [fetchDisputes])

  const handleResolve = (dispute: Dispute) => {
    Modal.confirm({
      title: t('disputes.resolveDispute'),
      content: (
        <div>
          <p>{t('disputes.confirmResolve')}</p>
          <p>¥{dispute.amount.toFixed(2)}</p>
        </div>
      ),
      onOk: async () => {
        try {
          const response = await apiClient.api.disputes[':id'].resolve.$put({
            param: { id: dispute.id },
            json: {
              resolution: '已同意退款，3-5个工作日内到账',
              resolvedBy: '客服人员',
            },
          })
          const result = await response.json()
          if (result.success) {
            message.success(t('disputes.disputeResolved'))
            fetchDisputes()
          }
        } catch {
          message.error(t('disputes.resolveFailed'))
        }
      },
    })
  }

  const showDetail = (dispute: Dispute) => {
    setSelectedDispute(dispute)
    setDetailVisible(true)
  }

  const columns = [
    {
      title: t('disputes.disputeNo'),
      dataIndex: 'disputeNo',
      key: 'disputeNo',
      render: (text: string) => <code className="text-sm">{text}</code>,
    },
    {
      title: t('disputes.orderNo'),
      dataIndex: 'orderNo',
      key: 'orderNo',
    },
    {
      title: t('disputes.customer'),
      key: 'customer',
      render: (_: unknown, record: Dispute) => (
        <div>
          <div className="font-medium">{record.customerName}</div>
          <div className="text-sm text-gray-500">{record.customerEmail}</div>
        </div>
      ),
    },
    {
      title: t('disputes.type'),
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => getTypeLabel(type),
    },
    {
      title: t('disputes.amount'),
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => (
        <span className="font-medium text-red-600">¥{amount.toFixed(2)}</span>
      ),
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag color={STATUS_COLORS[status]}>{getStatusLabel(status)}</Tag>,
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
      render: (_: unknown, record: Dispute) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<Eye className="w-4 h-4" />}
            onClick={() => showDetail(record)}
          >
            {t('common.view')}
          </Button>
          <PermissionGuard permission={Permission.TICKET_CLOSE}>
            {(record.status === 'pending' || record.status === 'investigating') && (
              <Button
                type="link"
                size="small"
                icon={<CheckCircle className="w-4 h-4" />}
                onClick={() => handleResolve(record)}
              >
                {t('disputes.resolve')}
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
          <h1 className="text-2xl font-bold text-gray-900">{t('disputes.title')}</h1>
          <p className="text-gray-600 mt-1">{t('disputes.subtitle')}</p>
        </div>
        <Button onClick={fetchDisputes}>{t('common.refresh')}</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">{t('disputes.totalDisputes')}</div>
              <div className="text-2xl font-bold">{disputes.length}</div>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-500" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">{t('disputes.pending')}</div>
              <div className="text-2xl font-bold text-orange-500">
                {disputes.filter(d => d.status === 'pending').length}
              </div>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-500" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">{t('disputes.resolved')}</div>
              <div className="text-2xl font-bold text-green-500">
                {disputes.filter(d => d.status === 'resolved').length}
              </div>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </Card>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={disputes}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={t('disputes.detail')}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={600}
      >
        {selectedDispute && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label={t('disputes.disputeNo')}>
              <code>{selectedDispute.disputeNo}</code>
            </Descriptions.Item>
            <Descriptions.Item label={t('disputes.orderNo')}>
              {selectedDispute.orderNo}
            </Descriptions.Item>
            <Descriptions.Item label={t('disputes.customer')}>
              {selectedDispute.customerName} ({selectedDispute.customerEmail})
            </Descriptions.Item>
            <Descriptions.Item label={t('disputes.type')}>
              {getTypeLabel(selectedDispute.type)}
            </Descriptions.Item>
            <Descriptions.Item label={t('disputes.amount')}>
              <span className="text-lg font-bold text-red-600">
                ¥{selectedDispute.amount.toFixed(2)}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label={t('common.status')}>
              <Tag color={STATUS_COLORS[selectedDispute.status]}>
                {getStatusLabel(selectedDispute.status)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('tickets.description')}>
              {selectedDispute.description}
            </Descriptions.Item>
            {selectedDispute.resolution && (
              <Descriptions.Item label={t('disputes.resolution')}>
                {selectedDispute.resolution}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}

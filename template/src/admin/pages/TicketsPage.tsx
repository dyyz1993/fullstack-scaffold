import { useState, useEffect, useCallback } from 'react'
import { Table, Card, Tag, Button, Space, Modal, message, Descriptions } from 'antd'
import { Eye, MessageCircle, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { PermissionGuard } from '../components/PermissionGuard'
import { Permission } from '@shared/modules/permission'
import { apiClient } from '../services/apiClient'
import type { Ticket } from '@shared/modules/ticket'
import { useLanguage } from '../i18n/useLanguage'

const PRIORITY_COLORS: Record<string, string> = {
  low: 'default',
  medium: 'blue',
  high: 'orange',
  urgent: 'red',
}

const STATUS_COLORS: Record<string, string> = {
  open: 'blue',
  in_progress: 'processing',
  waiting_customer: 'orange',
  resolved: 'success',
  closed: 'default',
}

export const TicketsPage: React.FC = () => {
  const { t, formatDate } = useLanguage()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)

  const getPriorityLabel = (priority: string) => {
    const map: Record<string, string> = {
      low: t('tickets.priorityLow'),
      medium: t('tickets.priorityMedium'),
      high: t('tickets.priorityHigh'),
      urgent: t('tickets.priorityUrgent'),
    }
    return map[priority] || priority
  }

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      open: t('tickets.statusOpen'),
      in_progress: t('tickets.statusInProgress'),
      waiting_customer: t('tickets.statusWaitingCustomer'),
      resolved: t('tickets.statusResolved'),
      closed: t('tickets.statusClosed'),
    }
    return map[status] || status
  }

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiClient.api.tickets.$get({ query: {} })
      const result = await response.json()
      if (result.success) {
        setTickets(result.data)
      } else {
        message.error(result.error || t('tickets.loadFailed'))
      }
    } catch {
      message.error(t('tickets.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  const handleClose = async (ticketId: string) => {
    Modal.confirm({
      title: t('tickets.confirmClose'),
      content: t('tickets.confirmCloseContent'),
      onOk: async () => {
        try {
          const response = await apiClient.api.tickets[':id'].close.$put({
            param: { id: ticketId },
          })
          const result = await response.json()
          if (result.success) {
            message.success(t('tickets.ticketClosed'))
            fetchTickets()
          }
        } catch {
          message.error(t('tickets.closeFailed'))
        }
      },
    })
  }

  const showDetail = (ticket: Ticket) => {
    setSelectedTicket(ticket)
    setDetailVisible(true)
  }

  const columns = [
    {
      title: t('tickets.ticketNo'),
      dataIndex: 'ticketNo',
      key: 'ticketNo',
      render: (text: string) => <code className="text-sm">{text}</code>,
    },
    {
      title: t('tickets.subject'),
      dataIndex: 'subject',
      key: 'subject',
    },
    {
      title: t('tickets.customer'),
      key: 'customer',
      render: (_: unknown, record: Ticket) => (
        <div>
          <div className="font-medium">{record.customerName}</div>
          <div className="text-sm text-gray-500">{record.customerEmail}</div>
        </div>
      ),
    },
    {
      title: t('tickets.priority'),
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string) => (
        <Tag color={PRIORITY_COLORS[priority]}>{getPriorityLabel(priority)}</Tag>
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
      render: (_: unknown, record: Ticket) => (
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
            {record.status !== 'closed' && (
              <Button
                type="link"
                size="small"
                icon={<CheckCircle className="w-4 h-4" />}
                onClick={() => handleClose(record.id)}
              >
                {t('common.close')}
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
          <h1 className="text-2xl font-bold text-gray-900">{t('tickets.title')}</h1>
          <p className="text-gray-600 mt-1">{t('tickets.subtitle')}</p>
        </div>
        <Button onClick={fetchTickets}>{t('common.refresh')}</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">{t('tickets.totalTickets')}</div>
              <div className="text-2xl font-bold">{tickets.length}</div>
            </div>
            <MessageCircle className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">{t('tickets.pending')}</div>
              <div className="text-2xl font-bold text-blue-500">
                {tickets.filter(t => t.status === 'open').length}
              </div>
            </div>
            <Clock className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">{t('tickets.urgent')}</div>
              <div className="text-2xl font-bold text-red-500">
                {tickets.filter(t => t.priority === 'urgent').length}
              </div>
            </div>
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">{t('tickets.resolved')}</div>
              <div className="text-2xl font-bold text-green-500">
                {tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length}
              </div>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </Card>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={tickets}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: total => t('common.total', { count: total }),
          }}
        />
      </Card>

      <Modal
        title={t('tickets.detail')}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={700}
      >
        {selectedTicket && (
          <div>
            <Descriptions column={2} bordered className="mb-4">
              <Descriptions.Item label={t('tickets.ticketNo')}>
                <code>{selectedTicket.ticketNo}</code>
              </Descriptions.Item>
              <Descriptions.Item label={t('common.status')}>
                <Tag color={STATUS_COLORS[selectedTicket.status]}>
                  {getStatusLabel(selectedTicket.status)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('tickets.customerName')}>
                {selectedTicket.customerName}
              </Descriptions.Item>
              <Descriptions.Item label={t('tickets.customerEmail')}>
                {selectedTicket.customerEmail}
              </Descriptions.Item>
              <Descriptions.Item label={t('tickets.priority')}>
                <Tag color={PRIORITY_COLORS[selectedTicket.priority]}>
                  {getPriorityLabel(selectedTicket.priority)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('tickets.assignedTo')}>
                {selectedTicket.assignedTo || t('tickets.unassigned')}
              </Descriptions.Item>
              <Descriptions.Item label={t('tickets.subject')} span={2}>
                {selectedTicket.subject}
              </Descriptions.Item>
              <Descriptions.Item label={t('tickets.description')} span={2}>
                {selectedTicket.description}
              </Descriptions.Item>
            </Descriptions>

            {selectedTicket.replies.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">{t('tickets.replies')}</h4>
                {selectedTicket.replies.map(reply => (
                  <div
                    key={reply.id}
                    className={`p-3 mb-2 rounded ${reply.isCustomer ? 'bg-gray-50' : 'bg-blue-50'}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium">{reply.author}</span>
                      <span className="text-sm text-gray-500">{formatDate(reply.createdAt)}</span>
                    </div>
                    <div className="text-gray-700">{reply.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

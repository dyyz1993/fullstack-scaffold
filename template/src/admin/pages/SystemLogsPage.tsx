import React, { useEffect, useState } from 'react'
import { Table, Card, Input, Select, Space, Tag, Button, Descriptions, Modal } from 'antd'
import { SearchOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons'
import { useAuditLogStore } from '../hooks/useAuditLogs'
import type { AuditLogType } from '@shared/modules/audit'
import {
  RESOURCE_TYPES,
  RESOURCE_LABELS,
  ACTION_TYPES,
  ACTION_LABELS,
  ACTION_COLORS,
  type ResourceType,
  type ActionType,
} from '@shared/constants'
import { useLanguage } from '../i18n/useLanguage'

const { Option } = Select

export const SystemLogsPage: React.FC = () => {
  const { t, formatDate } = useLanguage()
  const { logs, loading, fetchLogs } = useAuditLogStore()
  const [selectedLog, setSelectedLog] = useState<AuditLogType | null>(null)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [filters, setFilters] = useState<{
    userId: string
    action: ActionType | ''
    resourceType: ResourceType | ''
  }>({
    userId: '',
    action: '',
    resourceType: '',
  })

  const safeFormatJson = (val: string | null | undefined): string => {
    if (!val) return '-'
    try {
      return JSON.stringify(JSON.parse(val), null, 2)
    } catch {
      return val
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleSearch = () => {
    fetchLogs({
      userId: filters.userId || undefined,
      action: filters.action || undefined,
      resourceType: filters.resourceType || undefined,
    })
  }

  const handleReset = () => {
    setFilters({ userId: '', action: '', resourceType: '' })
    fetchLogs()
  }

  const handleViewDetail = (log: AuditLogType) => {
    setSelectedLog(log)
    setDetailModalVisible(true)
  }

  const columns = [
    {
      title: t('systemLogs.time'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => formatDate(date),
    },
    {
      title: t('systemLogs.userId'),
      dataIndex: 'userId',
      key: 'userId',
      width: 120,
    },
    {
      title: t('systemLogs.action'),
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (action: ActionType) => (
        <Tag color={ACTION_COLORS[action] || 'default'}>{ACTION_LABELS[action] || action}</Tag>
      ),
    },
    {
      title: t('systemLogs.resourceType'),
      dataIndex: 'resourceType',
      key: 'resourceType',
      width: 120,
      render: (type: ResourceType) => RESOURCE_LABELS[type] || type,
    },
    {
      title: t('systemLogs.resourceId'),
      dataIndex: 'resourceId',
      key: 'resourceId',
      width: 150,
      render: (id: string | null) => id || '-',
    },
    {
      title: t('systemLogs.ipAddress'),
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 140,
      render: (ip: string | null) => ip || '-',
    },
    {
      title: t('common.actions'),
      key: 'actionCol',
      width: 100,
      render: (_: unknown, record: AuditLogType) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
          {t('common.detail')}
        </Button>
      ),
    },
  ]

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={t('systemLogs.title')}
        extra={
          <Button icon={<ReloadOutlined />} onClick={() => fetchLogs()}>
            {t('common.refresh')}
          </Button>
        }
      >
        <Space style={{ marginBottom: '16px' }} wrap>
          <Input
            placeholder={t('systemLogs.userId')}
            value={filters.userId}
            onChange={e => setFilters({ ...filters, userId: e.target.value })}
            style={{ width: 150 }}
          />
          <Select
            placeholder={t('systemLogs.actionType')}
            value={filters.action || undefined}
            onChange={value => setFilters({ ...filters, action: (value || '') as ActionType | '' })}
            style={{ width: 120 }}
            allowClear
          >
            {Object.entries(ACTION_TYPES).map(([key, value]) => (
              <Option key={key} value={value}>
                {ACTION_LABELS[value]}
              </Option>
            ))}
          </Select>
          <Select
            placeholder={t('systemLogs.resourceType')}
            value={filters.resourceType || undefined}
            onChange={value =>
              setFilters({ ...filters, resourceType: (value || '') as ResourceType | '' })
            }
            style={{ width: 120 }}
            allowClear
          >
            {Object.entries(RESOURCE_TYPES).map(([key, value]) => (
              <Option key={key} value={value}>
                {RESOURCE_LABELS[value]}
              </Option>
            ))}
          </Select>
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            {t('common.search')}
          </Button>
          <Button onClick={handleReset}>{t('common.reset')}</Button>
        </Space>

        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: total => t('common.totalRecords', { count: total }),
          }}
        />
      </Card>

      <Modal
        title={t('systemLogs.detail')}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={700}
      >
        {selectedLog && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label={t('systemLogs.logId')}>{selectedLog.id}</Descriptions.Item>
            <Descriptions.Item label={t('systemLogs.userId')}>
              {selectedLog.userId}
            </Descriptions.Item>
            <Descriptions.Item label={t('systemLogs.action')}>
              <Tag color={ACTION_COLORS[selectedLog.action] || 'default'}>
                {ACTION_LABELS[selectedLog.action] || selectedLog.action}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('systemLogs.resourceType')}>
              {RESOURCE_LABELS[selectedLog.resourceType] || selectedLog.resourceType}
            </Descriptions.Item>
            <Descriptions.Item label={t('systemLogs.resourceId')}>
              {selectedLog.resourceId || '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('systemLogs.ipAddress')}>
              {selectedLog.ipAddress || '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('systemLogs.userAgent')}>
              {selectedLog.userAgent || '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('systemLogs.time')}>
              {formatDate(selectedLog.createdAt)}
            </Descriptions.Item>
            {selectedLog.oldValue && (
              <Descriptions.Item label={t('systemLogs.oldValue')}>
                <pre style={{ margin: 0, maxHeight: '200px', overflow: 'auto' }}>
                  {safeFormatJson(selectedLog.oldValue)}
                </pre>
              </Descriptions.Item>
            )}
            {selectedLog.newValue && (
              <Descriptions.Item label={t('systemLogs.newValue')}>
                <pre style={{ margin: 0, maxHeight: '200px', overflow: 'auto' }}>
                  {safeFormatJson(selectedLog.newValue)}
                </pre>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}

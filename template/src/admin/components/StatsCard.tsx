import { Card, Statistic } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'
import type { ReactNode } from 'react'
import { useLanguage } from '../i18n/useLanguage'

interface StatsCardProps {
  title: string
  value: number
  prefix?: ReactNode
  suffix?: string
  trend?: {
    value: number
    isUp: boolean
  }
  loading?: boolean
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  prefix,
  suffix,
  trend,
  loading,
}) => {
  const { t } = useLanguage()
  return (
    <Card loading={loading}>
      <Statistic
        title={title}
        value={value}
        prefix={prefix}
        suffix={suffix}
        valueStyle={{ fontSize: '24px', fontWeight: 'bold' }}
      />
      {trend && (
        <div className="mt-2">
          <span style={{ color: trend.isUp ? '#3f8600' : '#cf1322' }}>
            {trend.isUp ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {Math.abs(trend.value)}%
          </span>
          <span className="text-gray-400 ml-2">{t('common.vsLastMonth')}</span>
        </div>
      )}
    </Card>
  )
}

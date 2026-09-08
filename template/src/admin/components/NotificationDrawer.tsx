import { Bell, CheckCheck, Info, AlertTriangle, XCircle, CheckCircle } from 'lucide-react'
import { Badge, Button, Drawer, Empty, Spin, Tabs, theme } from 'antd'
import type { AppNotification, NotificationType } from '@shared/schemas'
import { useLanguage } from '../i18n/useLanguage'

interface NotificationDrawerProps {
  open: boolean
  onClose: () => void
  notifications: AppNotification[]
  unreadCount: number
  onMarkAsRead: (id: string) => void
  onMarkAllAsRead: () => void
  loading?: boolean
}

const typeConfig: Record<
  NotificationType,
  {
    colorToken: 'colorInfo' | 'colorWarning' | 'colorError' | 'colorSuccess'
    bgToken: 'colorInfoBg' | 'colorWarningBg' | 'colorErrorBg' | 'colorSuccessBg'
    icon: React.ReactNode
  }
> = {
  info: {
    colorToken: 'colorInfo',
    bgToken: 'colorInfoBg',
    icon: <Info className="w-4 h-4" />,
  },
  warning: {
    colorToken: 'colorWarning',
    bgToken: 'colorWarningBg',
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  error: {
    colorToken: 'colorError',
    bgToken: 'colorErrorBg',
    icon: <XCircle className="w-4 h-4" />,
  },
  success: {
    colorToken: 'colorSuccess',
    bgToken: 'colorSuccessBg',
    icon: <CheckCircle className="w-4 h-4" />,
  },
}

function formatTime(
  dateString: string,
  locale: string,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return t('notification.justNow')
  if (minutes < 60) return t('notification.minutesAgo', { count: minutes })
  if (hours < 24) return t('notification.hoursAgo', { count: hours })
  if (days < 7) return t('notification.daysAgo', { count: days })
  return date.toLocaleDateString(locale)
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  open,
  onClose,
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  loading,
}) => {
  const { t, currentLanguage } = useLanguage()
  const { token } = theme.useToken()

  const renderNotificationItem = (notif: AppNotification) => {
    const config = typeConfig[notif.type]
    const bgColor = token[config.bgToken]
    const fgColor = token[config.colorToken]

    return (
      <div
        key={notif.id}
        className="p-4 cursor-pointer transition-colors"
        style={{
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          backgroundColor: !notif.read ? token.colorInfoBg ?? 'transparent' : undefined,
        }}
        onClick={() => !notif.read && onMarkAsRead(notif.id)}
        onMouseEnter={e =>
          (e.currentTarget.style.backgroundColor = token.colorBgTextHover ?? 'transparent')
        }
        onMouseLeave={e =>
          (e.currentTarget.style.backgroundColor = !notif.read
            ? token.colorInfoBg ?? 'transparent'
            : 'transparent')
        }
      >
        <div className="flex items-start gap-3">
          <div
            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: bgColor, color: fgColor }}
          >
            {config.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate" style={{ color: token.colorText }}>
                {notif.title}
              </span>
              {!notif.read && (
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: token.colorPrimary }}
                />
              )}
            </div>
            <p className="text-sm mt-1 line-clamp-2" style={{ color: token.colorTextSecondary }}>
              {notif.message}
            </p>
            <span className="text-xs mt-1 block" style={{ color: token.colorTextTertiary }}>
              {formatTime(notif.createdAt, currentLanguage, t)}
            </span>
          </div>
        </div>
      </div>
    )
  }

  const unreadNotifications = notifications.filter(n => !n.read)
  const readNotifications = notifications.filter(n => n.read)

  const tabItems = [
    {
      key: 'all',
      label: `${t('notification.all')} (${notifications.length})`,
      children: (
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spin />
            </div>
          ) : notifications.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={t('notification.noNotifications')}
              className="py-12"
            />
          ) : (
            notifications.map(renderNotificationItem)
          )}
        </div>
      ),
    },
    {
      key: 'unread',
      label: `${t('notification.unread')} (${unreadNotifications.length})`,
      children: (
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {unreadNotifications.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={t('notification.noUnread')}
              className="py-12"
            />
          ) : (
            unreadNotifications.map(renderNotificationItem)
          )}
        </div>
      ),
    },
    {
      key: 'read',
      label: `${t('notification.read')} (${readNotifications.length})`,
      children: (
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {readNotifications.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={t('notification.noRead')}
              className="py-12"
            />
          ) : (
            readNotifications.map(renderNotificationItem)
          )}
        </div>
      ),
    },
  ]

  return (
    <Drawer
      title={
        <div className="flex items-center justify-between">
          <span>{t('notification.center')}</span>
          {unreadCount > 0 && (
            <Button
              type="link"
              size="small"
              icon={<CheckCheck className="w-4 h-4" />}
              onClick={onMarkAllAsRead}
              className="text-xs"
            >
              {t('notification.markAllRead')}
            </Button>
          )}
        </div>
      }
      placement="right"
      onClose={onClose}
      open={open}
      width={400}
      styles={{
        header: { borderBottom: `1px solid ${token.colorBorderSecondary}` },
        body: { padding: 0 },
      }}
    >
      <Tabs defaultActiveKey="all" items={tabItems} className="px-4" />
    </Drawer>
  )
}

export const NotificationBell: React.FC<{
  unreadCount: number
  onClick: () => void
}> = ({ unreadCount, onClick }) => {
  const { token } = theme.useToken()

  return (
    <button
      data-testid="notification-bell"
      className="p-2 rounded-lg transition-colors relative"
      style={{ color: token.colorTextSecondary }}
      onClick={onClick}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = token.colorBgTextHover)}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <Badge
          count={unreadCount > 99 ? '99+' : unreadCount}
          size="small"
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            minWidth: 18,
            height: 18,
            fontSize: 10,
            lineHeight: '18px',
          }}
        />
      )}
    </button>
  )
}

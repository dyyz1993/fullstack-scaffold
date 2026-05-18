/**
 * Notification Module Public API
 *
 * This is the public interface for the notification module.
 * Other modules should import from here, not from internal service paths.
 */
export { notificationRoutes } from './routes/notification-routes'
export {
  listNotifications,
  getNotification,
  createNotification,
  createNotificationAndBroadcast,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
  clearAllNotifications,
} from './services/notification-service'

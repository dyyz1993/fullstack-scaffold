import { getDb, getRawClient } from '../../db'
import { todos } from '../../db/schema'
import { desc } from 'drizzle-orm'
import { toISOString } from '../../utils/date'
import { getMockUsers } from '../../utils/auth'
import type {
  SystemStats,
  HealthCheck,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  User,
  UpdateUserRequest,
} from '@shared/modules/admin'
import type {
  AppNotification,
  NotificationType,
  CreateNotificationInput,
} from '@shared/modules/notifications'
import { generateUUID } from '../../utils/uuid'
import { realtime } from '@server/core'

const notifications: AppNotification[] = []

export function createNotification(input: CreateNotificationInput): AppNotification {
  const notification: AppNotification = {
    id: generateUUID(),
    type: input.type,
    title: input.title,
    message: input.message,
    read: false,
    createdAt: new Date().toISOString(),
  }

  notifications.unshift(notification)

  if (notifications.length > 100) {
    notifications.pop()
  }

  return notification
}

export async function createNotificationAndBroadcast(
  input: CreateNotificationInput
): Promise<AppNotification> {
  const notification = createNotification(input)
  await realtime.broadcast('notification', notification)

  const unreadCount = notifications.filter(n => !n.read).length
  await realtime.broadcast('unread-count', { count: unreadCount })

  return notification
}

export function getNotifications(options?: {
  unreadOnly?: boolean
  limit?: number
}): AppNotification[] {
  let result = [...notifications]

  if (options?.unreadOnly) {
    result = result.filter(n => !n.read)
  }

  const limit = options?.limit || 20
  return result.slice(0, limit)
}

export function getUnreadCount(): number {
  return notifications.filter(n => !n.read).length
}

export async function markNotificationRead(id: string): Promise<boolean> {
  const notification = notifications.find(n => n.id === id)
  if (notification) {
    notification.read = true
    const unreadCount = getUnreadCount()
    await realtime.broadcast('unread-count', { count: unreadCount })
    return true
  }
  return false
}

export async function markAllNotificationsRead(): Promise<number> {
  let count = 0
  for (const notification of notifications) {
    if (!notification.read) {
      notification.read = true
      count++
    }
  }
  await realtime.broadcast('unread-count', { count: 0 })
  return count
}

export async function sendTestNotification(
  type: NotificationType = 'info'
): Promise<AppNotification> {
  const titles: Record<NotificationType, string> = {
    info: '系统通知',
    warning: '警告通知',
    error: '错误通知',
    success: '成功通知',
  }

  const messages: Record<NotificationType, string> = {
    info: '这是一条普通信息通知',
    warning: '这是一条警告通知，请注意！',
    error: '这是一条错误通知，请立即处理！',
    success: '操作成功完成！',
  }

  return createNotificationAndBroadcast({
    type,
    title: titles[type],
    message: messages[type],
  })
}

export async function getSystemStats(): Promise<SystemStats> {
  const rawClient = await getRawClient()

  if (rawClient && 'execute' in rawClient) {
    const totalResult = await rawClient.execute('SELECT COUNT(*) as count FROM todos')
    const pendingResult = await rawClient.execute(
      "SELECT COUNT(*) as count FROM todos WHERE status = 'pending'"
    )
    const completedResult = await rawClient.execute(
      "SELECT COUNT(*) as count FROM todos WHERE status = 'completed'"
    )

    const getCount = (rows: unknown[]) => {
      const row = rows[0] as Record<string, unknown> | undefined
      return typeof row?.count === 'number' ? row.count : 0
    }

    return {
      totalTodos: getCount(totalResult.rows),
      pendingTodos: getCount(pendingResult.rows),
      completedTodos: getCount(completedResult.rows),
      lastUpdated: new Date().toISOString(),
    }
  }

  const db = await getDb()
  const allTodos = await db.select().from(todos)

  return {
    totalTodos: allTodos.length,
    pendingTodos: allTodos.filter(t => t.status === 'pending').length,
    completedTodos: allTodos.filter(t => t.status === 'completed').length,
    lastUpdated: new Date().toISOString(),
  }
}

export async function checkDatabaseHealth(): Promise<HealthCheck> {
  try {
    const db = await getDb()
    await db.select().from(todos).limit(1)
    return {
      database: 'connected',
      timestamp: new Date().toISOString(),
    }
  } catch {
    return {
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    }
  }
}

export async function clearAllTodos(): Promise<{ deletedCount: number }> {
  const db = await getDb()
  const result = await db.delete(todos).returning()
  return { deletedCount: result.length }
}

export async function getRecentActivity(limit: number = 10): Promise<
  Array<{
    id: number
    title: string
    status: string
    updatedAt: string
  }>
> {
  const db = await getDb()
  const results = await db.select().from(todos).orderBy(desc(todos.updatedAt)).limit(limit)

  return results.map(r => ({
    id: r.id,
    title: r.title,
    status: r.status,
    updatedAt: toISOString(r.updatedAt),
  }))
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const mockUsers = getMockUsers()
  const user = mockUsers.find(u => u.username === data.username)

  if (!user) {
    throw new Error('User not found')
  }

  if (data.password !== '123456') {
    throw new Error('Invalid password')
  }

  const token = user.role === 'admin' ? 'admin-token' : 'user-token'

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      permissions: user.role === 'admin' ? ['read', 'write', 'delete'] : ['read'],
    },
    token,
  }
}

export async function register(data: RegisterRequest): Promise<User> {
  const mockUsers = getMockUsers()
  const existingUser = mockUsers.find(u => u.username === data.username || u.email === data.email)

  if (existingUser) {
    throw new Error('User already exists')
  }

  const newUser: User = {
    id: String(mockUsers.length + 1),
    username: data.username,
    email: data.email,
    role: 'user',
    status: 'active',
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.username}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  mockUsers.push(newUser)

  return newUser
}

export async function getUsers(): Promise<User[]> {
  return getMockUsers()
}

export async function getUserById(id: string): Promise<User | null> {
  const mockUsers = getMockUsers()
  return mockUsers.find(u => u.id === id) || null
}

export async function updateUser(id: string, data: UpdateUserRequest): Promise<User> {
  const mockUsers = getMockUsers()
  const userIndex = mockUsers.findIndex(u => u.id === id)

  if (userIndex === -1) {
    throw new Error('User not found')
  }

  const updatedUser: User = {
    ...mockUsers[userIndex],
    ...data,
    updatedAt: new Date().toISOString(),
  }

  mockUsers[userIndex] = updatedUser

  return updatedUser
}

export async function deleteUser(id: string): Promise<void> {
  const mockUsers = getMockUsers()
  const userIndex = mockUsers.findIndex(u => u.id === id)

  if (userIndex === -1) {
    throw new Error('User not found')
  }

  mockUsers.splice(userIndex, 1)
}

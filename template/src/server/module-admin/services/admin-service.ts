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

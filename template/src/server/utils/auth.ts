import type { Context } from 'hono'
import type { AuthUser } from '../middleware/auth'
import type { User } from '@shared/modules/admin'

const mockUsers: User[] = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@example.com',
    role: 'admin',
    status: 'active',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    username: 'user1',
    email: 'user1@example.com',
    role: 'user',
    status: 'active',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
  {
    id: '3',
    username: 'guest1',
    email: 'guest1@example.com',
    role: 'guest',
    status: 'inactive',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=guest1',
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
  },
]

const mockTokens: Map<string, string> = new Map([
  ['admin-token-123', '1'],
  ['user-token-456', '2'],
])

export function getAuthUser(c: Context): AuthUser {
  return c.get('authUser')
}

export function verifyToken(token: string): User | null {
  const userId = mockTokens.get(token)

  if (!userId) {
    return null
  }

  return mockUsers.find(u => u.id === userId) || null
}

export function getMockUsers(): User[] {
  return mockUsers
}

export function getMockTokens(): Map<string, string> {
  return mockTokens
}

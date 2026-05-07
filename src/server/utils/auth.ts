import type { Context } from 'hono'
import type { AuthUser } from '../middleware/auth'

export function getAuthUser(c: Context): AuthUser {
  return c.get('authUser')
}

interface MockUser {
  id: string
  username: string
  email: string
  role: string
  status: string
  avatar: string
  createdAt: string
  updatedAt: string
}

const MOCK_USERS: MockUser[] = [
  {
    id: '1',
    username: 'superadmin',
    email: 'superadmin@example.com',
    role: 'super_admin',
    status: 'active',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=superadmin',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    username: 'customerservice',
    email: 'cs@example.com',
    role: 'customer_service',
    status: 'active',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=cs',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '3',
    username: 'user1',
    email: 'user1@example.com',
    role: 'user',
    status: 'active',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
]

const MOCK_TOKENS = new Map<string, string>([
  ['super-admin-token', '1'],
  ['customer-service-token', '2'],
  ['user-token', '3'],
])

export function verifyToken(token: string): MockUser | null {
  const userId = MOCK_TOKENS.get(token)
  if (!userId) return null
  return MOCK_USERS.find(u => u.id === userId) ?? null
}

export function getMockUsers(): MockUser[] {
  return MOCK_USERS
}

export function getMockTokens(): Map<string, string> {
  return MOCK_TOKENS
}

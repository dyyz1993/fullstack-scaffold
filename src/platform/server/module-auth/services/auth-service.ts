import { getMockUsers } from '@server/utils/auth'
import { Role, getPermissionsByRole } from '@platform/shared/permission'
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  User,
  UpdateUserRequest,
  CreateUserRequest,
} from '@platform/shared/auth'

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const mockUsers = getMockUsers()
  const user = mockUsers.find(u => u.username === data.username)

  if (!user) {
    throw new Error('User not found')
  }

  if (data.password !== '123456') {
    throw new Error('Invalid password')
  }

  let token: string
  if (user.role === Role.SUPER_ADMIN) {
    token = `test-super-admin-${user.id}`
  } else if (user.role === Role.CUSTOMER_SERVICE) {
    token = `test-customer-service-${user.id}`
  } else {
    token = `test-user-${user.id}`
  }

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      permissions: getPermissionsByRole(user.role as Role),
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
    role: Role.USER,
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

  const filteredData = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== null && v !== undefined)
  )

  const updatedUser: User = {
    ...mockUsers[userIndex]!,
    ...filteredData,
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

export async function createUser(data: CreateUserRequest): Promise<User> {
  const mockUsers = getMockUsers()

  const existingUser = mockUsers.find(u => u.username === data.username || u.email === data.email)
  if (existingUser) {
    throw new Error('User with this username or email already exists')
  }

  const newUser: User = {
    id: `user-${Date.now()}`,
    username: data.username,
    email: data.email,
    role: data.role,
    status: data.status || 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  mockUsers.push(newUser)
  return newUser
}

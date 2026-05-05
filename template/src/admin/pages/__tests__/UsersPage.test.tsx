import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UsersPage } from '../UsersPage'
import { Role } from '@shared/modules/permission'
import type { User } from '@shared/modules/admin'

const mockUsers: User[] = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@test.com',
    role: Role.SUPER_ADMIN,
    status: 'active',
    avatar: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: '2',
    username: 'user1',
    email: 'user@test.com',
    role: Role.USER,
    status: 'locked',
    avatar: null,
    createdAt: '2024-01-02T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  },
]

const mockUsersGet = vi.fn()
const mockUsersPost = vi.fn()
const mockUsersPut = vi.fn()
const mockUsersDelete = vi.fn()

vi.mock('../../services/apiClient', () => ({
  apiClient: {
    api: {
      admin: {
        users: {
          $get: (...args: unknown[]) => mockUsersGet(...args),
          $post: (...args: unknown[]) => mockUsersPost(...args),
          ':id': {
            $put: (...args: unknown[]) => mockUsersPut(...args),
            $delete: (...args: unknown[]) => mockUsersDelete(...args),
          },
        },
      },
    },
  },
  api: (
    promise: Promise<{ ok: boolean; json: () => Promise<{ success: boolean; data: unknown }> }>
  ) => ({
    withLoading: () => ({
      json: async () => {
        const res = await promise
        const result = await res.json()
        if (!res.ok) throw new Error('API Error')
        return result.data
      },
    }),
    json: async () => {
      const res = await promise
      const result = await res.json()
      if (!res.ok) throw new Error('API Error')
      return result.data
    },
  }),
}))

vi.mock('../../hooks/useConfig', () => ({
  useRoleLabels: () => ({
    roleLabels: {
      super_admin: '超级管理员',
      customer_service: '客服人员',
      user: '普通用户',
    },
    loading: false,
  }),
}))

vi.mock('../../hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: () => true,
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
    permissions: [],
    role: null,
    roles: [],
    allPermissions: [],
    menuConfig: [],
    pagePermissions: [],
    loading: false,
    initialized: true,
    initPermissions: vi.fn(),
    fetchStaticData: vi.fn(),
    reset: vi.fn(),
    refreshPermissions: vi.fn(),
  }),
}))

vi.mock('antd', async () => {
  const actual = await vi.importActual('antd')
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
    },
  }
})

function createSuccessResponse(data: unknown) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true, data }),
  })
}

describe('UsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUsersGet.mockReturnValue(createSuccessResponse(mockUsers))
    mockUsersPost.mockReturnValue(createSuccessResponse(null))
    mockUsersPut.mockReturnValue(createSuccessResponse(null))
    mockUsersDelete.mockReturnValue(createSuccessResponse(null))
  })

  it('renders page with title and users table', async () => {
    render(<UsersPage />)

    expect(screen.getByText('用户管理')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('admin')).toBeInTheDocument()
      expect(screen.getByText('user1')).toBeInTheDocument()
    })
  })

  it('fetches and displays users list', async () => {
    render(<UsersPage />)

    await waitFor(() => {
      expect(mockUsersGet).toHaveBeenCalled()
      expect(screen.getByText('admin@test.com')).toBeInTheDocument()
      expect(screen.getByText('user@test.com')).toBeInTheDocument()
    })
  })

  it('create user button opens modal', async () => {
    const user = userEvent.setup()
    render(<UsersPage />)

    await waitFor(() => {
      expect(screen.getByText('admin')).toBeInTheDocument()
    })

    await user.click(screen.getByText('创建用户'))

    await waitFor(() => {
      expect(screen.getByText('创建用户', { selector: '.ant-modal-title' })).toBeInTheDocument()
    })
  })

  it('edit user button opens pre-filled modal', async () => {
    const user = userEvent.setup()
    render(<UsersPage />)

    await waitFor(() => {
      expect(screen.getByText('admin')).toBeInTheDocument()
    })

    const editButtons = screen.getAllByText('编辑')
    await user.click(editButtons[0])

    await waitFor(() => {
      expect(screen.getByText('编辑用户', { selector: '.ant-modal-title' })).toBeInTheDocument()
    })
  })

  it('lock/unlock toggle calls API', async () => {
    const user = userEvent.setup()
    render(<UsersPage />)

    await waitFor(() => {
      expect(screen.getByText('admin')).toBeInTheDocument()
    })

    const lockButtons = screen.getAllByText('锁定')
    await user.click(lockButtons[0])

    await waitFor(() => {
      expect(mockUsersPut).toHaveBeenCalled()
    })
  })

  it('delete user with confirmation dialog', async () => {
    const user = userEvent.setup()
    render(<UsersPage />)

    await waitFor(() => {
      expect(screen.getByText('admin')).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByText('删除')
    await user.click(deleteButtons[0])

    await waitFor(() => {
      expect(screen.getByText('确定要删除此用户吗？')).toBeInTheDocument()
    })
  })

  it('displays status tags correctly', async () => {
    render(<UsersPage />)

    await waitFor(() => {
      expect(screen.getByText('正常')).toBeInTheDocument()
      expect(screen.getByText('已锁定')).toBeInTheDocument()
    })
  })

  it('displays role tags', async () => {
    render(<UsersPage />)

    await waitFor(() => {
      expect(screen.getByText('超级管理员')).toBeInTheDocument()
      expect(screen.getByText('普通用户')).toBeInTheDocument()
    })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RolesPage } from '../RolesPage'
import type { RoleDataType } from '@shared/modules/role/schemas'

const mockRoles: RoleDataType[] = [
  {
    id: '1',
    code: 'super_admin',
    name: 'Super Admin',
    label: '超级管理员',
    description: 'System super admin',
    isSystem: true,
    isActive: true,
    sortOrder: 1,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: '2',
    code: 'editor',
    name: 'Editor',
    label: '编辑者',
    description: 'Content editor',
    isSystem: false,
    isActive: true,
    sortOrder: 2,
    createdAt: '2025-01-02',
    updatedAt: '2025-01-02',
  },
]

const mockFetchRoles = vi.fn()
const mockCreateRole = vi.fn()
const mockUpdateRole = vi.fn()
const mockDeleteRole = vi.fn()
const mockUpdateRolePermissions = vi.fn()
const mockRefreshPermissions = vi.fn()

vi.mock('@admin/hooks/useRoles', () => ({
  useRoleStore: () => ({
    roles: mockRoles,
    loading: false,
    fetchRoles: mockFetchRoles,
    createRole: mockCreateRole,
    updateRole: mockUpdateRole,
    deleteRole: mockDeleteRole,
    updateRolePermissions: mockUpdateRolePermissions,
  }),
}))

vi.mock('@admin/hooks/useConfig', () => ({
  useConfig: () => ({
    permissions: [
      { permission: 'user:view', label: '查看用户', category: 'user' },
      { permission: 'user:create', label: '创建用户', category: 'user' },
    ],
    loading: false,
  }),
  usePermissionCategories: () => ({
    categories: { user: { label: '用户管理', permissions: ['user:view', 'user:create'] } },
    loading: false,
  }),
}))

vi.mock('@admin/hooks/usePermissions', () => ({
  usePermissions: () => ({
    permissions: [],
    role: null,
    roles: [],
    allPermissions: [],
    loading: false,
    refreshPermissions: mockRefreshPermissions,
  }),
}))

const mockRoleGet = vi.fn()
vi.mock('@admin/services/apiClient', () => ({
  apiClient: {
    api: {
      roles: {
        $get: vi.fn(),
        $post: vi.fn(),
        ':id': {
          $get: () => mockRoleGet(),
          $put: vi.fn(),
          $delete: vi.fn(),
          permissions: { $put: vi.fn() },
        },
      },
    },
  },
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

describe('RolesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchRoles.mockResolvedValue(undefined)
    mockCreateRole.mockResolvedValue(true)
    mockUpdateRole.mockResolvedValue(true)
    mockDeleteRole.mockResolvedValue(true)
    mockUpdateRolePermissions.mockResolvedValue(true)
    mockRoleGet.mockResolvedValue({
      json: () =>
        Promise.resolve({
          success: true,
          data: { ...mockRoles[1], permissions: ['user:view'] },
        }),
    })
  })

  it('renders roles table on mount', async () => {
    render(<RolesPage />)

    expect(mockFetchRoles).toHaveBeenCalled()
    await waitFor(() => {
      expect(screen.getByText('Super Admin')).toBeInTheDocument()
      expect(screen.getByText('编辑者')).toBeInTheDocument()
    })
  })

  it('create role button opens modal', async () => {
    const user = userEvent.setup()
    render(<RolesPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /创建角色/ })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /创建角色/ }))

    await waitFor(() => {
      expect(screen.getByLabelText('角色代码')).toBeInTheDocument()
    })
  })

  it('create role form submits', async () => {
    const user = userEvent.setup()
    render(<RolesPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /创建角色/ })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /创建角色/ }))

    await waitFor(() => {
      expect(screen.getByLabelText('角色代码')).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText('角色代码'), 'test_role')
    await user.type(screen.getByLabelText('角色名称'), 'Test Role')
    await user.type(screen.getByLabelText('显示名称'), '测试角色')

    await user.click(screen.getByRole('button', { name: '确 定' }))

    await waitFor(() => {
      expect(mockCreateRole).toHaveBeenCalled()
    })
  })

  it('edit role opens pre-filled modal', async () => {
    const user = userEvent.setup()
    render(<RolesPage />)

    await waitFor(() => {
      expect(screen.getAllByText('编辑').length).toBeGreaterThan(0)
    })

    const editButtons = screen.getAllByText('编辑')
    await user.click(editButtons[0])

    await waitFor(() => {
      expect(screen.getByDisplayValue('Super Admin')).toBeInTheDocument()
      expect(screen.getByDisplayValue('超级管理员')).toBeInTheDocument()
    })
  })

  it('system roles cannot be deleted', async () => {
    render(<RolesPage />)

    await waitFor(() => {
      expect(screen.getByText('Super Admin')).toBeInTheDocument()
    })

    expect(screen.queryByText('确定要删除这个角色吗？')).not.toBeInTheDocument()
  })

  it('delete custom role with confirmation', async () => {
    const user = userEvent.setup()
    render(<RolesPage />)

    await waitFor(() => {
      expect(screen.getByText('编辑者')).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByRole('button', { name: /删除/ })
    expect(deleteButtons.length).toBeGreaterThan(0)

    await user.click(deleteButtons[0])

    await waitFor(() => {
      expect(screen.getByText('确定要删除这个角色吗？')).toBeInTheDocument()
    })

    const okButton = document.querySelector('.ant-popconfirm .ant-btn-primary')
    await user.click(okButton!)

    await waitFor(() => {
      expect(mockDeleteRole).toHaveBeenCalledWith('2')
    })
  })

  it('manage permissions button opens modal', async () => {
    const user = userEvent.setup()
    render(<RolesPage />)

    await waitFor(() => {
      expect(screen.getByText('权限')).toBeInTheDocument()
    })

    await user.click(screen.getByText('权限'))

    await waitFor(() => {
      expect(screen.getByText(/管理角色权限/)).toBeInTheDocument()
    })
  })

  it('permission tree renders in modal', async () => {
    const user = userEvent.setup()
    render(<RolesPage />)

    await waitFor(() => {
      expect(screen.getByText('权限')).toBeInTheDocument()
    })

    await user.click(screen.getByText('权限'))

    await waitFor(() => {
      expect(screen.getByText('树状选择')).toBeInTheDocument()
      expect(screen.getByText('JSON编辑')).toBeInTheDocument()
    })
  })
})

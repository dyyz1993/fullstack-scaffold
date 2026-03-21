import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import {
  PermissionProvider,
  usePermissions,
  useHasPermission,
  useHasAnyPermission,
  useHasAllPermissions,
  useMenuConfig,
  usePagePermissions,
} from '../usePermissions'
import { Permission, Role } from '@shared/modules/permission'

vi.mock('../../stores/adminStore', () => ({
  useAdminStore: vi.fn(() => ({
    user: { id: 'test-user-1', role: Role.CUSTOMER_SERVICE },
    isAuthenticated: true,
  })),
}))

const mockInitData = {
  success: true,
  data: {
    permissions: [Permission.USER_VIEW, Permission.CONTENT_VIEW, Permission.ORDER_VIEW],
    menuConfig: [
      { path: '/dashboard', label: '仪表盘', icon: 'LayoutDashboard', permissions: [] },
      { path: '/users', label: '用户管理', icon: 'Users', permissions: [Permission.USER_VIEW] },
    ],
    pagePermissions: [
      {
        path: '/users',
        label: '用户管理',
        requiredPermissions: [Permission.USER_VIEW],
        actions: [],
      },
    ],
    role: Role.CUSTOMER_SERVICE,
  },
}

vi.mock('../../services/apiClient', () => ({
  apiClient: {
    api: {
      permissions: {
        init: {
          $get: vi.fn(async () => ({
            json: async () => mockInitData,
          })),
        },
        roles: {
          $get: vi.fn(async () => ({
            json: async () => ({
              success: true,
              data: [
                { role: Role.SUPER_ADMIN, label: '超级管理员', permissions: [] },
                { role: Role.CUSTOMER_SERVICE, label: '客服人员', permissions: [] },
              ],
            }),
          })),
        },
        $get: vi.fn(async () => ({
          json: async () => ({
            success: true,
            data: [{ permission: Permission.USER_VIEW, label: '查看用户', category: 'user' }],
          }),
        })),
      },
    },
  },
}))

const TestComponent = () => {
  const {
    permissions,
    role,
    menuConfig,
    pagePermissions,
    loading,
    initialized,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  } = usePermissions()

  return (
    <div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="initialized">{initialized.toString()}</div>
      <div data-testid="role">{role}</div>
      <div data-testid="permissions">{permissions.join(',')}</div>
      <div data-testid="menu-count">{menuConfig.length}</div>
      <div data-testid="page-permissions-count">{pagePermissions.length}</div>
      <div data-testid="has-user-view">{hasPermission(Permission.USER_VIEW).toString()}</div>
      <div data-testid="has-user-delete">{hasPermission(Permission.USER_DELETE).toString()}</div>
      <div data-testid="has-any">
        {hasAnyPermission([Permission.USER_VIEW, Permission.USER_DELETE]).toString()}
      </div>
      <div data-testid="has-all">
        {hasAllPermissions([Permission.USER_VIEW, Permission.CONTENT_VIEW]).toString()}
      </div>
    </div>
  )
}

describe('usePermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should throw error when used outside PermissionProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent />)
    }).toThrow('usePermissions must be used within a PermissionProvider')

    consoleError.mockRestore()
  })

  it('should provide permission context values', async () => {
    render(
      <PermissionProvider>
        <TestComponent />
      </PermissionProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('initialized').textContent).toBe('true')
    })

    expect(screen.getByTestId('role').textContent).toBe(Role.CUSTOMER_SERVICE)
    expect(screen.getByTestId('permissions').textContent).toContain(Permission.USER_VIEW)
    expect(screen.getByTestId('menu-count').textContent).toBe('2')
    expect(screen.getByTestId('page-permissions-count').textContent).toBe('1')
  })

  it('should correctly check hasPermission', async () => {
    render(
      <PermissionProvider>
        <TestComponent />
      </PermissionProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('initialized').textContent).toBe('true')
    })

    expect(screen.getByTestId('has-user-view').textContent).toBe('true')
    expect(screen.getByTestId('has-user-delete').textContent).toBe('false')
  })

  it('should correctly check hasAnyPermission', async () => {
    render(
      <PermissionProvider>
        <TestComponent />
      </PermissionProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('initialized').textContent).toBe('true')
    })

    expect(screen.getByTestId('has-any').textContent).toBe('true')
  })

  it('should correctly check hasAllPermissions', async () => {
    render(
      <PermissionProvider>
        <TestComponent />
      </PermissionProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('initialized').textContent).toBe('true')
    })

    expect(screen.getByTestId('has-all').textContent).toBe('true')
  })
})

describe('useHasPermission', () => {
  const TestHasPermissionComponent = ({ permission }: { permission: Permission }) => {
    const hasPermission = useHasPermission(permission)
    return <div data-testid="has-permission">{hasPermission.toString()}</div>
  }

  it('should return correct permission check result', async () => {
    render(
      <PermissionProvider>
        <TestHasPermissionComponent permission={Permission.USER_VIEW} />
      </PermissionProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('has-permission').textContent).toBe('true')
    })
  })
})

describe('useHasAnyPermission', () => {
  const TestHasAnyPermissionComponent = ({ permissions }: { permissions: Permission[] }) => {
    const hasAny = useHasAnyPermission(permissions)
    return <div data-testid="has-any-permission">{hasAny.toString()}</div>
  }

  it('should return true when user has any of the permissions', async () => {
    render(
      <PermissionProvider>
        <TestHasAnyPermissionComponent
          permissions={[Permission.USER_VIEW, Permission.USER_DELETE]}
        />
      </PermissionProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('has-any-permission').textContent).toBe('true')
    })
  })
})

describe('useHasAllPermissions', () => {
  const TestHasAllPermissionsComponent = ({ permissions }: { permissions: Permission[] }) => {
    const hasAll = useHasAllPermissions(permissions)
    return <div data-testid="has-all-permissions">{hasAll.toString()}</div>
  }

  it('should return true when user has all permissions', async () => {
    render(
      <PermissionProvider>
        <TestHasAllPermissionsComponent
          permissions={[Permission.USER_VIEW, Permission.CONTENT_VIEW]}
        />
      </PermissionProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('has-all-permissions').textContent).toBe('true')
    })
  })
})

describe('useMenuConfig', () => {
  const TestMenuConfigComponent = () => {
    const { menuConfig, loading, initialized } = useMenuConfig()
    return (
      <div>
        <div data-testid="menu-loading">{loading.toString()}</div>
        <div data-testid="menu-initialized">{initialized.toString()}</div>
        <div data-testid="menu-items">{menuConfig.map(m => m.label).join(',')}</div>
      </div>
    )
  }

  it('should return menu config from context', async () => {
    render(
      <PermissionProvider>
        <TestMenuConfigComponent />
      </PermissionProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('menu-initialized').textContent).toBe('true')
    })

    expect(screen.getByTestId('menu-items').textContent).toContain('仪表盘')
    expect(screen.getByTestId('menu-items').textContent).toContain('用户管理')
  })
})

describe('usePagePermissions', () => {
  const TestPagePermissionsComponent = () => {
    const { pagePermissions, loading, initialized } = usePagePermissions()
    return (
      <div>
        <div data-testid="page-loading">{loading.toString()}</div>
        <div data-testid="page-initialized">{initialized.toString()}</div>
        <div data-testid="page-count">{pagePermissions.length}</div>
      </div>
    )
  }

  it('should return page permissions from context', async () => {
    render(
      <PermissionProvider>
        <TestPagePermissionsComponent />
      </PermissionProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('page-initialized').textContent).toBe('true')
    })

    expect(screen.getByTestId('page-count').textContent).toBe('1')
  })
})

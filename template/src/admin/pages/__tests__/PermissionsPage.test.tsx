import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { PermissionsPage } from '../PermissionsPage'

vi.mock('../../hooks/usePermissions', () => ({
  usePermissions: () => ({
    allPermissions: [
      { permission: 'user:view', label: '查看用户', category: 'user' },
      { permission: 'user:create', label: '创建用户', category: 'user' },
      { permission: 'content:view', label: '查看内容', category: 'content' },
    ],
    roles: [
      {
        role: 'super_admin',
        label: '超级管理员',
        permissions: ['user:view', 'user:create', 'content:view'],
      },
      {
        role: 'customer_service',
        label: '客服人员',
        permissions: ['user:view'],
      },
      { role: 'user', label: '普通用户', permissions: ['content:view'] },
    ],
    loading: false,
  }),
}))

vi.mock('../../hooks/useConfig', () => ({
  usePermissionCategories: () => ({
    categories: {
      user: { label: '用户管理', permissions: ['user:view', 'user:create'] },
      content: { label: '内容管理', permissions: ['content:view'] },
    },
    loading: false,
  }),
  useRoleLabels: () => ({
    roleLabels: {
      super_admin: '超级管理员',
      customer_service: '客服人员',
      user: '普通用户',
    },
    loading: false,
  }),
  usePermissionLabels: () => ({
    permissionLabels: {
      'user:view': '查看用户',
      'user:create': '创建用户',
      'content:view': '查看内容',
    },
    loading: false,
  }),
}))

describe('PermissionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders role list cards', async () => {
    render(<PermissionsPage />)

    await waitFor(() => {
      expect(screen.getAllByText('超级管理员').length).toBeGreaterThanOrEqual(2)
      expect(screen.getAllByText('客服人员').length).toBeGreaterThanOrEqual(2)
      expect(screen.getAllByText('普通用户').length).toBeGreaterThanOrEqual(2)
    })

    expect(screen.getByText('权限数量: 3')).toBeInTheDocument()
    expect(screen.getAllByText('权限数量: 1').length).toBeGreaterThanOrEqual(2)
  })

  it('renders permission matrix grouped by category', async () => {
    render(<PermissionsPage />)

    await waitFor(() => {
      expect(screen.getByText('用户管理')).toBeInTheDocument()
      expect(screen.getByText('内容管理')).toBeInTheDocument()
    })

    expect(screen.getByText('查看用户')).toBeInTheDocument()
    expect(screen.getByText('创建用户')).toBeInTheDocument()
    expect(screen.getByText('查看内容')).toBeInTheDocument()
  })

  it('shows check/cross indicators for each permission per role', async () => {
    render(<PermissionsPage />)

    await waitFor(() => {
      const checkTags = screen.getAllByText('✓')
      const crossTags = screen.getAllByText('✗')
      expect(checkTags.length).toBeGreaterThan(0)
      expect(crossTags.length).toBeGreaterThan(0)
    })
  })

  it('loading state while data fetches', async () => {
    vi.resetModules()

    vi.doMock('../../hooks/usePermissions', () => ({
      usePermissions: () => ({
        allPermissions: [],
        roles: [],
        loading: true,
      }),
    }))

    vi.doMock('../../hooks/useConfig', () => ({
      usePermissionCategories: () => ({ categories: {}, loading: true }),
      useRoleLabels: () => ({ roleLabels: {}, loading: true }),
      usePermissionLabels: () => ({ permissionLabels: {}, loading: true }),
    }))

    const { PermissionsPage: LazyPage } = await import('../PermissionsPage')
    render(<LazyPage />)

    expect(screen.getByText('权限管理')).toBeInTheDocument()
  })
})

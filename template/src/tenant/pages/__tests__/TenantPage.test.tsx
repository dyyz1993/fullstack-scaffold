import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { TenantPage } from '../TenantPage'
import type { TenantRole, Tenant, TenantMember } from '../../stores/tenantStore'

type MockTenant = Tenant
type MockTenantRole = TenantRole
type MockTenantMember = TenantMember

interface MockTenantStore {
  tenants: MockTenant[]
  currentTenant: MockTenant | null
  roles: MockTenantRole[]
  members: MockTenantMember[]
  permissions: string[]
  isLoading: boolean
  error: string | null
  setTenants: ReturnType<typeof vi.fn>
  setCurrentTenant: ReturnType<typeof vi.fn>
  setRoles: ReturnType<typeof vi.fn>
  setMembers: ReturnType<typeof vi.fn>
  setPermissions: ReturnType<typeof vi.fn>
  setLoading: ReturnType<typeof vi.fn>
  setError: ReturnType<typeof vi.fn>
  addTenant: ReturnType<typeof vi.fn>
  updateTenant: ReturnType<typeof vi.fn>
  removeTenant: ReturnType<typeof vi.fn>
  addMember: ReturnType<typeof vi.fn>
  updateMember: ReturnType<typeof vi.fn>
  removeMember: ReturnType<typeof vi.fn>
  addRole: ReturnType<typeof vi.fn>
  updateRole: ReturnType<typeof vi.fn>
  removeRole: ReturnType<typeof vi.fn>
  hasPermission: ReturnType<typeof vi.fn>
  reset: ReturnType<typeof vi.fn>
}

const mockTenantStore: MockTenantStore = {
  tenants: [],
  currentTenant: null,
  roles: [],
  members: [],
  permissions: [],
  isLoading: false,
  error: null,
  setTenants: vi.fn(),
  setCurrentTenant: vi.fn(),
  setRoles: vi.fn(),
  setMembers: vi.fn(),
  setPermissions: vi.fn(),
  setLoading: vi.fn(),
  setError: vi.fn(),
  addTenant: vi.fn(),
  updateTenant: vi.fn(),
  removeTenant: vi.fn(),
  addMember: vi.fn(),
  updateMember: vi.fn(),
  removeMember: vi.fn(),
  addRole: vi.fn(),
  updateRole: vi.fn(),
  removeRole: vi.fn(),
  hasPermission: vi.fn().mockReturnValue(true),
  reset: vi.fn(),
}

vi.mock('../../stores/tenantStore', () => ({
  useTenantStore: vi.fn((selector?: (state: MockTenantStore) => unknown) => {
    if (selector) {
      return selector(mockTenantStore)
    }
    return mockTenantStore
  }),
}))

vi.mock('../../services/tenantApi', () => ({
  tenantApi: {
    getTenants: vi.fn().mockResolvedValue([]),
    getRoles: vi.fn().mockResolvedValue([]),
    getMembers: vi.fn().mockResolvedValue([]),
    createTenant: vi.fn().mockResolvedValue({
      id: '1',
      code: 'test',
      name: 'Test Tenant',
      slug: 'test-tenant',
      logo: null,
      description: null,
      plan: 'free',
      status: 'active',
      maxMembers: null,
      maxStorage: null,
      ownerId: 'user1',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
    inviteMember: vi.fn().mockResolvedValue({
      id: '1',
      tenantId: '1',
      email: 'test@example.com',
      roleId: '1',
      inviterId: 'user1',
      token: 'test-token',
      status: 'pending',
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      createdAt: Date.now(),
    }),
  },
}))

const createMockTenant = (overrides: Partial<MockTenant> = {}): MockTenant => ({
  id: '1',
  code: 'test',
  name: 'Test Tenant',
  slug: 'test-tenant',
  logo: null,
  description: null,
  plan: 'free',
  status: 'active',
  maxMembers: null,
  maxStorage: null,
  ownerId: 'user1',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
})

const createMockRole = (overrides: Partial<MockTenantRole> = {}): MockTenantRole => ({
  id: '1',
  tenantId: '1',
  code: 'admin',
  name: 'Admin',
  label: '管理员',
  description: null,
  permissions: JSON.stringify(['read', 'write']),
  isSystem: true,
  isActive: true,
  sortOrder: 1,
  ...overrides,
})

const createMockMember = (overrides: Partial<MockTenantMember> = {}): MockTenantMember => ({
  id: '1',
  tenantId: '1',
  userId: 'user1',
  roleId: '1',
  status: 'active',
  invitedBy: null,
  invitedAt: null,
  joinedAt: Date.now(),
  lastActiveAt: Date.now(),
  role: createMockRole(),
  ...overrides,
})

describe('TenantPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTenantStore.tenants = []
    mockTenantStore.currentTenant = null
    mockTenantStore.roles = []
    mockTenantStore.members = []
    mockTenantStore.isLoading = false
    mockTenantStore.error = null
  })

  describe('Initial Render', () => {
    it('should render page title', () => {
      render(<TenantPage />)
      expect(screen.getByText('租户管理')).toBeInTheDocument()
    })

    it('should render create tenant button', () => {
      render(<TenantPage />)
      const createButtons = screen.getAllByText('创建租户')
      expect(createButtons.length).toBeGreaterThan(0)
    })

    it('should show loading state when loading', () => {
      mockTenantStore.isLoading = true
      mockTenantStore.tenants = []
      render(<TenantPage />)
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no tenants', () => {
      mockTenantStore.tenants = []
      render(<TenantPage />)
      expect(screen.getByText('暂无租户')).toBeInTheDocument()
      expect(screen.getByText('创建您的第一个租户开始使用')).toBeInTheDocument()
    })
  })

  describe('Tenant List', () => {
    it('should display tenant buttons when tenants exist', () => {
      mockTenantStore.tenants = [
        createMockTenant({ id: '1', name: 'Tenant 1' }),
        createMockTenant({ id: '2', name: 'Tenant 2' }),
      ]
      mockTenantStore.currentTenant = createMockTenant({ id: '1', name: 'Tenant 1' })
      render(<TenantPage />)
      expect(screen.getByText('Tenant 1')).toBeInTheDocument()
      expect(screen.getByText('Tenant 2')).toBeInTheDocument()
    })

    it('should highlight current tenant', () => {
      mockTenantStore.tenants = [
        createMockTenant({ id: '1', name: 'Tenant 1' }),
        createMockTenant({ id: '2', name: 'Tenant 2' }),
      ]
      mockTenantStore.currentTenant = createMockTenant({ id: '1', name: 'Tenant 1' })
      render(<TenantPage />)
      const tenant1Button = screen.getByText('Tenant 1').closest('button')
      expect(tenant1Button).toHaveClass('bg-blue-600')
    })

    it('should call setCurrentTenant when clicking tenant button', () => {
      mockTenantStore.tenants = [
        createMockTenant({ id: '1', name: 'Tenant 1' }),
        createMockTenant({ id: '2', name: 'Tenant 2' }),
      ]
      mockTenantStore.currentTenant = createMockTenant({ id: '1', name: 'Tenant 1' })
      render(<TenantPage />)
      fireEvent.click(screen.getByText('Tenant 2'))
      expect(mockTenantStore.setCurrentTenant).toHaveBeenCalled()
    })
  })

  describe('Tab Navigation', () => {
    beforeEach(() => {
      mockTenantStore.tenants = [createMockTenant()]
      mockTenantStore.currentTenant = createMockTenant()
    })

    it('should render tab buttons', () => {
      render(<TenantPage />)
      expect(screen.getByText('成员管理')).toBeInTheDocument()
      expect(screen.getByText('角色管理')).toBeInTheDocument()
      expect(screen.getByText('设置')).toBeInTheDocument()
    })

    it('should show members tab by default', () => {
      render(<TenantPage />)
      expect(screen.getByText('成员列表')).toBeInTheDocument()
    })

    it('should switch to roles tab when clicked', () => {
      render(<TenantPage />)
      fireEvent.click(screen.getByText('角色管理'))
      expect(screen.getByText('角色列表')).toBeInTheDocument()
    })

    it('should switch to settings tab when clicked', () => {
      render(<TenantPage />)
      fireEvent.click(screen.getByText('设置'))
      expect(screen.getByText('租户设置')).toBeInTheDocument()
    })
  })

  describe('Members Tab', () => {
    beforeEach(() => {
      mockTenantStore.tenants = [createMockTenant()]
      mockTenantStore.currentTenant = createMockTenant()
    })

    it('should show empty state when no members', () => {
      mockTenantStore.members = []
      render(<TenantPage />)
      expect(screen.getByText('暂无成员')).toBeInTheDocument()
    })

    it('should display members when they exist', () => {
      mockTenantStore.members = [createMockMember({ userId: 'user123' })]
      mockTenantStore.roles = [createMockRole()]
      render(<TenantPage />)
      expect(screen.getByText('user123')).toBeInTheDocument()
    })

    it('should show invite button', () => {
      render(<TenantPage />)
      expect(screen.getByText('邀请成员')).toBeInTheDocument()
    })
  })

  describe('Roles Tab', () => {
    beforeEach(() => {
      mockTenantStore.tenants = [createMockTenant()]
      mockTenantStore.currentTenant = createMockTenant()
    })

    it('should show empty state when no roles', () => {
      mockTenantStore.roles = []
      render(<TenantPage />)
      fireEvent.click(screen.getByText('角色管理'))
      expect(screen.getByText('暂无角色')).toBeInTheDocument()
    })

    it('should display roles when they exist', () => {
      mockTenantStore.roles = [createMockRole({ label: '管理员角色' })]
      render(<TenantPage />)
      fireEvent.click(screen.getByText('角色管理'))
      expect(screen.getByText('管理员角色')).toBeInTheDocument()
    })

    it('should show system role badge for system roles', () => {
      mockTenantStore.roles = [createMockRole({ isSystem: true })]
      render(<TenantPage />)
      fireEvent.click(screen.getByText('角色管理'))
      expect(screen.getByText('系统角色')).toBeInTheDocument()
    })
  })

  describe('Settings Tab', () => {
    beforeEach(() => {
      mockTenantStore.tenants = [createMockTenant()]
      mockTenantStore.currentTenant = createMockTenant({
        name: 'My Company',
        slug: 'my-company',
        plan: 'pro',
        status: 'active',
      })
    })

    it('should display tenant settings', () => {
      render(<TenantPage />)
      fireEvent.click(screen.getByText('设置'))
      expect(screen.getByText('租户设置')).toBeInTheDocument()
      expect(screen.getByDisplayValue('My Company')).toBeInTheDocument()
      expect(screen.getByDisplayValue('my-company')).toBeInTheDocument()
    })

    it('should display plan and status', () => {
      render(<TenantPage />)
      fireEvent.click(screen.getByText('设置'))
      expect(screen.getByDisplayValue('pro')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should show error message when error exists', () => {
      mockTenantStore.error = '加载租户失败'
      mockTenantStore.tenants = []
      render(<TenantPage />)
      expect(screen.getByText('加载租户失败')).toBeInTheDocument()
    })

    it('should show retry button on error', () => {
      mockTenantStore.error = '加载租户失败'
      mockTenantStore.tenants = []
      render(<TenantPage />)
      expect(screen.getByText('重试')).toBeInTheDocument()
    })
  })

  describe('Create Tenant Modal', () => {
    it('should open create modal when clicking create button', () => {
      render(<TenantPage />)
      const createButtons = screen.getAllByText('创建租户')
      fireEvent.click(createButtons[0])
      expect(screen.getByPlaceholderText('我的公司')).toBeInTheDocument()
    })
  })
})

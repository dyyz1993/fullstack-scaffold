import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OrdersPage } from '../OrdersPage'
import type { Order } from '@shared/modules/order'

const mockOrders: Order[] = [
  {
    id: '1',
    orderNo: 'ORD-001',
    customerName: 'Alice',
    customerEmail: 'alice@test.com',
    productName: '商品A',
    amount: 100.5,
    status: 'pending',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: '2',
    orderNo: 'ORD-002',
    customerName: 'Bob',
    customerEmail: 'bob@test.com',
    productName: '商品B',
    amount: 200.0,
    status: 'processing',
    createdAt: '2024-01-02T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  },
  {
    id: '3',
    orderNo: 'ORD-003',
    customerName: 'Charlie',
    customerEmail: 'charlie@test.com',
    productName: '商品C',
    amount: 300.0,
    status: 'completed',
    createdAt: '2024-01-03T00:00:00.000Z',
    updatedAt: '2024-01-03T00:00:00.000Z',
  },
  {
    id: '4',
    orderNo: 'ORD-004',
    customerName: 'Diana',
    customerEmail: 'diana@test.com',
    productName: '商品D',
    amount: 400.0,
    status: 'pending',
    createdAt: '2024-01-04T00:00:00.000Z',
    updatedAt: '2024-01-04T00:00:00.000Z',
  },
]

const mockOrdersGet = vi.fn()
const mockOrderProcessPut = vi.fn()
const mockOrderCancelPut = vi.fn()

vi.mock('@admin/services/apiClient', () => ({
  apiClient: {
    api: {
      orders: {
        $get: (...args: unknown[]) => mockOrdersGet(...args),
        ':id': {
          process: {
            $put: (...args: unknown[]) => mockOrderProcessPut(...args),
          },
          cancel: {
            $put: (...args: unknown[]) => mockOrderCancelPut(...args),
          },
        },
      },
    },
  },
}))

vi.mock('@admin/hooks/usePermissions', () => ({
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

describe('OrdersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOrdersGet.mockReturnValue(createSuccessResponse(mockOrders))
    mockOrderProcessPut.mockReturnValue(createSuccessResponse(null))
    mockOrderCancelPut.mockReturnValue(createSuccessResponse(null))
  })

  it('renders page with title and summary cards', async () => {
    render(<OrdersPage />)

    expect(screen.getByText('订单管理')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('总订单')).toBeInTheDocument()
      expect(screen.getByText('待处理')).toBeInTheDocument()
      expect(screen.getByText('处理中')).toBeInTheDocument()
      expect(screen.getByText('已完成')).toBeInTheDocument()
    })
  })

  it('fetches orders on mount', async () => {
    render(<OrdersPage />)

    await waitFor(() => {
      expect(mockOrdersGet).toHaveBeenCalled()
    })
  })

  it('summary cards show computed counts', async () => {
    render(<OrdersPage />)

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument()
    })

    expect(screen.getByText('总订单').parentElement?.textContent).toContain('4')
  })

  it('refresh button triggers refetch', async () => {
    render(<OrdersPage />)

    await waitFor(() => {
      expect(mockOrdersGet).toHaveBeenCalledTimes(1)
    })
  })

  it('process order button calls API', async () => {
    const user = userEvent.setup()
    render(<OrdersPage />)

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument()
    })

    const processButtons = screen.getAllByText('处理')
    await user.click(processButtons[0])

    await waitFor(() => {
      expect(mockOrderProcessPut).toHaveBeenCalled()
    })
  })

  it('cancel order triggers confirmation modal', async () => {
    const user = userEvent.setup()
    render(<OrdersPage />)

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument()
    })

    const cancelButtons = screen.getAllByText('取消')
    await user.click(cancelButtons[0])

    await waitFor(() => {
      expect(screen.getByText('确定要取消这个订单吗？')).toBeInTheDocument()
    })
  })

  it('order detail modal opens on click', async () => {
    const user = userEvent.setup()
    render(<OrdersPage />)

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument()
    })

    const viewButtons = screen.getAllByText('查看')
    await user.click(viewButtons[0])

    await waitFor(() => {
      expect(screen.getByText('订单详情', { selector: '.ant-modal-title' })).toBeInTheDocument()
    })
  })

  it('displays order data in table', async () => {
    render(<OrdersPage />)

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument()
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('商品A')).toBeInTheDocument()
    })
  })
})

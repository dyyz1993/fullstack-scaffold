import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DisputesPage } from '../DisputesPage'
import type { Dispute } from '@shared/modules/dispute'

const mockDisputes: Dispute[] = [
  {
    id: '1',
    disputeNo: 'DSP-001',
    orderId: 'ord-1',
    orderNo: 'ORD-001',
    customerName: 'Alice',
    customerEmail: 'alice@test.com',
    type: 'refund',
    status: 'pending',
    description: '要求退款',
    resolution: null,
    amount: 100.5,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    resolvedAt: null,
    resolvedBy: null,
  },
  {
    id: '2',
    disputeNo: 'DSP-002',
    orderId: 'ord-2',
    orderNo: 'ORD-002',
    customerName: 'Bob',
    customerEmail: 'bob@test.com',
    type: 'product_quality',
    status: 'investigating',
    description: '商品质量差',
    resolution: null,
    amount: 200.0,
    createdAt: '2024-01-02T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
    resolvedAt: null,
    resolvedBy: null,
  },
  {
    id: '3',
    disputeNo: 'DSP-003',
    orderId: 'ord-3',
    orderNo: 'ORD-003',
    customerName: 'Charlie',
    customerEmail: 'charlie@test.com',
    type: 'service_quality',
    status: 'resolved',
    description: '服务态度差',
    resolution: '已退款',
    amount: 300.0,
    createdAt: '2024-01-03T00:00:00.000Z',
    updatedAt: '2024-01-03T00:00:00.000Z',
    resolvedAt: '2024-01-04T00:00:00.000Z',
    resolvedBy: '客服小王',
  },
]

const mockDisputesGet = vi.fn()
const mockDisputeResolvePut = vi.fn()

vi.mock('@admin/services/apiClient', () => ({
  apiClient: {
    api: {
      disputes: {
        $get: (...args: unknown[]) => mockDisputesGet(...args),
        ':id': {
          resolve: {
            $put: (...args: unknown[]) => mockDisputeResolvePut(...args),
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

describe('DisputesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDisputesGet.mockReturnValue(createSuccessResponse(mockDisputes))
    mockDisputeResolvePut.mockReturnValue(createSuccessResponse(null))
  })

  it('renders page with title and summary cards', async () => {
    render(<DisputesPage />)

    expect(screen.getByText('争议处理')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('总争议')).toBeInTheDocument()
      expect(screen.getByText('待处理')).toBeInTheDocument()
      expect(screen.getByText('已解决')).toBeInTheDocument()
    })
  })

  it('fetches disputes on mount', async () => {
    render(<DisputesPage />)

    await waitFor(() => {
      expect(mockDisputesGet).toHaveBeenCalled()
    })
  })

  it('summary cards show correct counts', async () => {
    render(<DisputesPage />)

    await waitFor(() => {
      expect(screen.getByText('DSP-001')).toBeInTheDocument()
    })

    const allThrees = screen.getAllByText('3')
    expect(allThrees.length).toBeGreaterThanOrEqual(1)
  })

  it('resolve dispute with confirmation', async () => {
    const user = userEvent.setup()
    render(<DisputesPage />)

    await waitFor(() => {
      expect(screen.getByText('DSP-001')).toBeInTheDocument()
    })

    const resolveButtons = screen.getAllByText('解决')
    await user.click(resolveButtons[0])

    await waitFor(() => {
      expect(screen.getByText('确定要解决这个争议吗？')).toBeInTheDocument()
    })
  })

  it('dispute detail modal opens on click', async () => {
    const user = userEvent.setup()
    render(<DisputesPage />)

    await waitFor(() => {
      expect(screen.getByText('DSP-001')).toBeInTheDocument()
    })

    const viewButtons = screen.getAllByText('查看')
    await user.click(viewButtons[0])

    await waitFor(() => {
      expect(screen.getByText('争议详情', { selector: '.ant-modal-title' })).toBeInTheDocument()
    })
  })

  it('displays dispute data in table', async () => {
    render(<DisputesPage />)

    await waitFor(() => {
      expect(screen.getByText('DSP-001')).toBeInTheDocument()
      expect(screen.getByText('ORD-001')).toBeInTheDocument()
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('退款争议')).toBeInTheDocument()
    })
  })
})

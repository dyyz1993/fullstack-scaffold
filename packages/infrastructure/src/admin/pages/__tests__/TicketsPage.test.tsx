import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TicketsPage } from '../TicketsPage'
import type { Ticket } from '@shared/modules/ticket'

const mockTickets: Ticket[] = [
  {
    id: '1',
    ticketNo: 'TK-001',
    customerName: 'Alice',
    customerEmail: 'alice@test.com',
    subject: '无法登录',
    description: '登录页面报错',
    status: 'open',
    priority: 'high',
    category: 'technical',
    assignedTo: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    replies: [
      {
        id: 'r1',
        ticketId: '1',
        content: '我无法登录系统',
        author: 'Alice',
        isCustomer: true,
        createdAt: '2024-01-01T01:00:00.000Z',
      },
    ],
  },
  {
    id: '2',
    ticketNo: 'TK-002',
    customerName: 'Bob',
    customerEmail: 'bob@test.com',
    subject: '退款问题',
    description: '退款未到账',
    status: 'resolved',
    priority: 'urgent',
    category: 'billing',
    assignedTo: '客服小王',
    createdAt: '2024-01-02T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
    replies: [],
  },
  {
    id: '3',
    ticketNo: 'TK-003',
    customerName: 'Charlie',
    customerEmail: 'charlie@test.com',
    subject: '功能建议',
    description: '希望增加导出功能',
    status: 'closed',
    priority: 'low',
    category: 'feature_request',
    assignedTo: null,
    createdAt: '2024-01-03T00:00:00.000Z',
    updatedAt: '2024-01-03T00:00:00.000Z',
    replies: [],
  },
]

const mockTicketsGet = vi.fn()
const mockTicketClosePut = vi.fn()

vi.mock('@admin/services/apiClient', () => ({
  apiClient: {
    api: {
      tickets: {
        $get: (...args: unknown[]) => mockTicketsGet(...args),
        ':id': {
          close: {
            $put: (...args: unknown[]) => mockTicketClosePut(...args),
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

describe('TicketsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTicketsGet.mockReturnValue(createSuccessResponse(mockTickets))
    mockTicketClosePut.mockReturnValue(createSuccessResponse(null))
  })

  it('renders page with title and summary cards', async () => {
    render(<TicketsPage />)

    expect(screen.getByText('客服中心')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('总工单')).toBeInTheDocument()
      expect(screen.getByText('待处理')).toBeInTheDocument()
      expect(screen.getByText('紧急')).toBeInTheDocument()
      expect(screen.getByText('已解决')).toBeInTheDocument()
    })
  })

  it('fetches tickets on mount', async () => {
    render(<TicketsPage />)

    await waitFor(() => {
      expect(mockTicketsGet).toHaveBeenCalled()
    })
  })

  it('summary cards show correct counts', async () => {
    render(<TicketsPage />)

    await waitFor(() => {
      expect(screen.getByText('TK-001')).toBeInTheDocument()
    })

    const allThrees = screen.getAllByText('3')
    expect(allThrees.length).toBeGreaterThanOrEqual(1)
  })

  it('close ticket with confirmation', async () => {
    const user = userEvent.setup()
    render(<TicketsPage />)

    await waitFor(() => {
      expect(screen.getByText('TK-001')).toBeInTheDocument()
    })

    const closeButtons = screen.getAllByText('关闭')
    await user.click(closeButtons[0])

    await waitFor(() => {
      expect(screen.getByText('确定要关闭这个工单吗？')).toBeInTheDocument()
    })
  })

  it('ticket detail modal shows replies', async () => {
    const user = userEvent.setup()
    render(<TicketsPage />)

    await waitFor(() => {
      expect(screen.getByText('TK-001')).toBeInTheDocument()
    })

    const viewButtons = screen.getAllByText('查看')
    await user.click(viewButtons[0])

    await waitFor(() => {
      expect(screen.getByText('工单详情', { selector: '.ant-modal-title' })).toBeInTheDocument()
      expect(screen.getByText('回复记录')).toBeInTheDocument()
      expect(screen.getByText('我无法登录系统')).toBeInTheDocument()
    })
  })

  it('displays ticket data in table', async () => {
    render(<TicketsPage />)

    await waitFor(() => {
      expect(screen.getByText('TK-001')).toBeInTheDocument()
      expect(screen.getByText('无法登录')).toBeInTheDocument()
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('退款问题')).toBeInTheDocument()
    })
  })
})

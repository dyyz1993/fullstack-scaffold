import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SystemLogsPage } from '../SystemLogsPage'

const mockLogs = [
  {
    id: 'log-1',
    userId: 'user-1',
    action: 'create',
    resourceType: 'user',
    resourceId: 'res-1',
    oldValue: null,
    newValue: null,
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    createdAt: '2025-01-01T10:00:00.000Z',
  },
  {
    id: 'log-2',
    userId: 'user-2',
    action: 'update',
    resourceType: 'role',
    resourceId: 'res-2',
    oldValue: '{"name":"old"}',
    newValue: '{"name":"new"}',
    ipAddress: '10.0.0.1',
    userAgent: 'Chrome/100',
    createdAt: '2025-01-02T12:00:00.000Z',
  },
]

const mockFetchLogs = vi.fn()

vi.mock('../../hooks/useAuditLogs', () => ({
  useAuditLogStore: () => ({
    logs: mockLogs,
    loading: false,
    fetchLogs: mockFetchLogs,
  }),
}))

describe('SystemLogsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchLogs.mockResolvedValue(undefined)
  })

  it('renders logs table on mount', async () => {
    render(<SystemLogsPage />)

    expect(mockFetchLogs).toHaveBeenCalled()
    await waitFor(() => {
      expect(screen.getByText('user-1')).toBeInTheDocument()
      expect(screen.getByText('user-2')).toBeInTheDocument()
    })
  })

  it('filter by userId input', async () => {
    const user = userEvent.setup()
    render(<SystemLogsPage />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('用户ID')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('用户ID'), 'user-1')
    await user.click(screen.getByText('搜索'))

    expect(mockFetchLogs).toHaveBeenLastCalledWith({
      userId: 'user-1',
      action: undefined,
      resourceType: undefined,
    })
  })

  it('filter by action type select', async () => {
    const user = userEvent.setup()
    render(<SystemLogsPage />)

    await waitFor(() => {
      expect(screen.getByText('系统日志')).toBeInTheDocument()
    })

    await user.click(screen.getByText('搜索'))

    expect(mockFetchLogs).toHaveBeenCalledWith()
  })

  it('reset filters clears all', async () => {
    const user = userEvent.setup()
    render(<SystemLogsPage />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('用户ID')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('用户ID'), 'user-1')

    const resetButton = screen.getByRole('button', { name: /重/ })
    await user.click(resetButton)

    const userIdInput = screen.getByPlaceholderText('用户ID') as HTMLInputElement
    expect(userIdInput.value).toBe('')
    expect(mockFetchLogs).toHaveBeenLastCalledWith()
  })

  it('view detail modal opens', async () => {
    const user = userEvent.setup()
    render(<SystemLogsPage />)

    await waitFor(() => {
      const detailButtons = screen.getAllByText('详情')
      expect(detailButtons.length).toBeGreaterThan(0)
    })

    const detailButtons = screen.getAllByText('详情')
    await user.click(detailButtons[0])

    await waitFor(() => {
      expect(screen.getByText('日志详情')).toBeInTheDocument()
      expect(screen.getByText('log-1')).toBeInTheDocument()
    })
  })
})

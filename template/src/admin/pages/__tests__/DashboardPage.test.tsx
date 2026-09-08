import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DashboardPage } from '../DashboardPage'

const mockStatsGet = vi.fn()
const mockNotificationPost = vi.fn()

vi.mock('@admin/services/apiClient', () => ({
  apiClient: {
    api: {
      admin: {
        stats: {
          $get: () => mockStatsGet(),
        },
        notifications: {
          test: {
            $post: (...args: unknown[]) => mockNotificationPost(...args),
          },
        },
      },
    },
  },
}))

vi.mock('antd', async () => {
  const React = await import('react')
  return {
    Button: ({
      children,
      onClick,
      loading,
      ...rest
    }: {
      children: React.ReactNode
      onClick?: () => void
      loading?: boolean
      [key: string]: unknown
    }) => React.createElement('button', { onClick, 'data-loading': loading, ...rest }, children),
    Select: ({
      value,
      onChange,
      options,
      ...rest
    }: {
      value: string
      onChange?: (v: string) => void
      options?: { value: string; label: string }[]
      [key: string]: unknown
    }) =>
      React.createElement(
        'select',
        {
          value,
          onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onChange?.(e.target.value),
          'data-testid': 'notification-type-select',
          ...rest,
        },
        options?.map((o: { value: string; label: string }) =>
          React.createElement('option', { key: o.value, value: o.value }, o.label)
        )
      ),
    message: {
      success: vi.fn(),
      error: vi.fn(),
    },
    theme: {
      useToken: () => ({
        token: {
          colorText: '#000',
          colorTextSecondary: '#666',
          colorBgContainer: '#fff',
          colorBorderSecondary: '#eee',
        },
      }),
    },
  }
})

vi.mock('lucide-react', async () => {
  const React = await import('react')
  const icons = ['Activity', 'CheckCircle', 'Clock', 'TrendingUp', 'BellRing']
  const mock: Record<string, React.FC<{ className?: string; style?: unknown }>> = {}
  for (const name of icons) {
    mock[name] = (props: { className?: string; style?: unknown }) =>
      React.createElement('span', { 'data-testid': `icon-${name}`, ...props })
  }
  return mock
})

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStatsGet.mockResolvedValue({
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            totalTodos: 42,
            pendingTodos: 10,
            completedTodos: 32,
            lastUpdated: '2025-01-01',
          },
        }),
    })
  })

  it('renders dashboard heading', async () => {
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('仪表盘')).toBeInTheDocument()
    })
  })

  it('shows loading state initially', () => {
    mockStatsGet.mockReturnValue(new Promise(() => {}))
    render(<DashboardPage />)

    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })

  it('displays stats cards after data loads', async () => {
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('总待办')).toBeInTheDocument()
      expect(screen.getByText('42')).toBeInTheDocument()
      expect(screen.getByText('待处理')).toBeInTheDocument()
      expect(screen.getByText('10')).toBeInTheDocument()
      expect(screen.getByText('已完成')).toBeInTheDocument()
      expect(screen.getByText('32')).toBeInTheDocument()
      expect(screen.getByText('最后更新')).toBeInTheDocument()
      expect(screen.getByText('2025-01-01')).toBeInTheDocument()
    })
  })

  it('notification type selector and send button exist', async () => {
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('测试通知功能')).toBeInTheDocument()
      expect(screen.getByText('发送测试通知')).toBeInTheDocument()
    })
  })

  it('shows success message after sending test notification', async () => {
    const user = userEvent.setup()
    const { message } = await import('antd')

    mockNotificationPost.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true }),
    })

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('发送测试通知')).toBeInTheDocument()
    })

    await user.click(screen.getByText('发送测试通知'))

    await waitFor(() => {
      expect(message.success).toHaveBeenCalled()
    })
  })

  it('shows error on notification send failure', async () => {
    const user = userEvent.setup()
    const { message } = await import('antd')

    mockNotificationPost.mockRejectedValueOnce(new Error('Failed'))

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('发送测试通知')).toBeInTheDocument()
    })

    await user.click(screen.getByText('发送测试通知'))

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('发送失败')
    })
  })

  it('shows error when notification API returns failure', async () => {
    const user = userEvent.setup()
    const { message } = await import('antd')

    mockNotificationPost.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: false }),
    })

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('发送测试通知')).toBeInTheDocument()
    })

    await user.click(screen.getByText('发送测试通知'))

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('发送失败')
    })
  })
})

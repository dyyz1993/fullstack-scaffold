import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsPage } from '../SettingsPage'

const mockApiFn = vi.fn()

vi.mock('@shared/core/api-request', () => ({
  api: (...args: unknown[]) => {
    mockApiFn(...args)
    return {
      withLoading: () => ({
        json: () =>
          Promise.resolve({
            siteName: 'Test',
            siteDescription: '',
            smtpHost: 'smtp.test.com',
            smtpPort: 587,
            emailFrom: 'test@test.com',
            sessionTimeout: 30,
            maxLoginAttempts: 5,
          }),
      }),
    }
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

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders General Settings card with form', async () => {
    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('系统设置')).toBeInTheDocument()
      expect(screen.getByText('通用设置')).toBeInTheDocument()
      expect(screen.getByText('站点名称')).toBeInTheDocument()
      expect(screen.getByText('站点描述')).toBeInTheDocument()
    })
  })

  it('renders Notification Settings card with toggles', async () => {
    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('通知设置')).toBeInTheDocument()
      expect(screen.getByText('邮件通知')).toBeInTheDocument()
      expect(screen.getByText('推送通知')).toBeInTheDocument()
    })
  })

  it('renders Security Settings card', async () => {
    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('安全设置')).toBeInTheDocument()
      expect(screen.getByText('会话超时')).toBeInTheDocument()
      expect(screen.getByText('最大登录尝试次数')).toBeInTheDocument()
    })
  })

  it('save button shows success message', async () => {
    const user = userEvent.setup()
    const { message } = await import('antd')

    mockApiFn.mockReturnValue({
      withLoading: () => ({
        json: () => Promise.resolve({}),
      }),
    })

    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('系统设置')).toBeInTheDocument()
    })

    const saveButton = screen.getByRole('button', { name: /保\s*存\s*更\s*改/ })
    await user.click(saveButton)

    await waitFor(() => {
      expect(message.success).toHaveBeenCalledWith('设置保存成功！')
    })
  })

  it('toggle switches are present and interactive', async () => {
    render(<SettingsPage />)

    await waitFor(() => {
      const switches = screen.getAllByRole('switch')
      expect(switches.length).toBeGreaterThanOrEqual(2)
    })
  })
})

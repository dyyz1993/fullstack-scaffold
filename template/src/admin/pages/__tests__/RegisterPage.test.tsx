import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RegisterPage } from '../RegisterPage'

const mockNavigate = vi.fn()
const mockPost = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))

vi.mock('@admin/services/apiClient', () => ({
  apiClient: {
    api: {
      admin: {
        register: {
          $post: (...args: unknown[]) => mockPost(...args),
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

function getSubmitButton() {
  return screen.getByRole('button', { name: /注\s*册/ })
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders registration form', () => {
    render(<RegisterPage />)

    expect(screen.getByText('管理员注册')).toBeInTheDocument()
    expect(getSubmitButton()).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.click(getSubmitButton())

    await waitFor(() => {
      expect(screen.getByText('请输入用户名！')).toBeInTheDocument()
    })
  })

  it('validates email format', async () => {
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.type(screen.getByPlaceholderText('用户名'), 'testuser')
    await user.type(screen.getByPlaceholderText('邮箱'), 'invalid-email')
    await user.type(screen.getByPlaceholderText('密码'), 'password123')
    await user.type(screen.getByPlaceholderText('确认密码'), 'password123')

    await user.click(getSubmitButton())

    await waitFor(() => {
      expect(screen.getByText('请输入有效的邮箱！')).toBeInTheDocument()
    })
  })

  it('validates password minimum length', async () => {
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.type(screen.getByPlaceholderText('用户名'), 'testuser')
    await user.type(screen.getByPlaceholderText('邮箱'), 'test@example.com')
    await user.type(screen.getByPlaceholderText('密码'), '12345')

    await user.click(getSubmitButton())

    await waitFor(() => {
      expect(screen.getByText('密码至少6个字符！')).toBeInTheDocument()
    })
  })

  it('validates password confirmation match', async () => {
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.type(screen.getByPlaceholderText('用户名'), 'testuser')
    await user.type(screen.getByPlaceholderText('邮箱'), 'test@example.com')
    await user.type(screen.getByPlaceholderText('密码'), 'password123')
    await user.type(screen.getByPlaceholderText('确认密码'), 'different')

    await user.click(getSubmitButton())

    await waitFor(() => {
      expect(screen.getByText('两次密码不一致！')).toBeInTheDocument()
    })
  })

  it('calls register API and navigates to login on success', async () => {
    const user = userEvent.setup()
    const { message } = await import('antd')

    mockPost.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true }),
    })

    render(<RegisterPage />)

    await user.type(screen.getByPlaceholderText('用户名'), 'testuser')
    await user.type(screen.getByPlaceholderText('邮箱'), 'test@example.com')
    await user.type(screen.getByPlaceholderText('密码'), 'password123')
    await user.type(screen.getByPlaceholderText('确认密码'), 'password123')

    await user.click(getSubmitButton())

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalled()
      expect(message.success).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })

  it('shows error on registration failure', async () => {
    const user = userEvent.setup()
    const { message } = await import('antd')

    mockPost.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: false, error: 'Username taken' }),
    })

    render(<RegisterPage />)

    await user.type(screen.getByPlaceholderText('用户名'), 'testuser')
    await user.type(screen.getByPlaceholderText('邮箱'), 'test@example.com')
    await user.type(screen.getByPlaceholderText('密码'), 'password123')
    await user.type(screen.getByPlaceholderText('确认密码'), 'password123')

    await user.click(getSubmitButton())

    await waitFor(() => {
      expect(message.error).toHaveBeenCalled()
    })
  })

  it('shows error on network failure', async () => {
    const user = userEvent.setup()
    const { message } = await import('antd')

    mockPost.mockRejectedValueOnce(new Error('Network error'))

    render(<RegisterPage />)

    await user.type(screen.getByPlaceholderText('用户名'), 'testuser')
    await user.type(screen.getByPlaceholderText('邮箱'), 'test@example.com')
    await user.type(screen.getByPlaceholderText('密码'), 'password123')
    await user.type(screen.getByPlaceholderText('确认密码'), 'password123')

    await user.click(getSubmitButton())

    await waitFor(() => {
      expect(message.error).toHaveBeenCalled()
    })
  })
})

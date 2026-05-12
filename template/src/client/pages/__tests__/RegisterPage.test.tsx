import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { RegisterPage } from '../RegisterPage'
import { MemoryRouter } from 'react-router-dom'

interface MockAuthStore {
  register: ReturnType<typeof vi.fn>
  loading: boolean
  error: string | null
  clearError: ReturnType<typeof vi.fn>
}

const mockStore: MockAuthStore = {
  register: vi.fn().mockResolvedValue(undefined),
  loading: false,
  error: null,
  clearError: vi.fn(),
}

vi.mock('@client/stores/authStore', () => ({
  useAuthStore: Object.assign(
    vi.fn((selector?: (state: MockAuthStore) => unknown) => {
      if (selector) {
        return selector(mockStore)
      }
      return mockStore
    }),
    {
      getState: () => mockStore,
    }
  ),
}))

const renderRegisterPage = () =>
  render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>
  )

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore.loading = false
    mockStore.error = null
    mockStore.register.mockResolvedValue(undefined)
  })

  describe('Initial Render', () => {
    it('should render register page container', () => {
      renderRegisterPage()
      expect(screen.getByTestId('register-page')).toBeInTheDocument()
    })

    it('should render page title', () => {
      renderRegisterPage()
      const headings = screen.getAllByText('Create Account')
      expect(headings[0]).toBeInTheDocument()
    })

    it('should render subtitle', () => {
      renderRegisterPage()
      expect(screen.getByText('Join Biomimic App today')).toBeInTheDocument()
    })
  })

  describe('Form Inputs', () => {
    it('should render username input', () => {
      renderRegisterPage()
      expect(screen.getByTestId('register-username')).toBeInTheDocument()
    })

    it('should render email input', () => {
      renderRegisterPage()
      expect(screen.getByTestId('register-email')).toBeInTheDocument()
    })

    it('should render password input', () => {
      renderRegisterPage()
      expect(screen.getByTestId('register-password')).toBeInTheDocument()
    })

    it('should render submit button', () => {
      renderRegisterPage()
      expect(screen.getByTestId('register-submit')).toBeInTheDocument()
    })

    it('should show Create Account text when not loading', () => {
      renderRegisterPage()
      expect(screen.getByTestId('register-submit')).toHaveTextContent('Create Account')
    })

    it('should show Creating account... text when loading', () => {
      mockStore.loading = true
      renderRegisterPage()
      expect(screen.getByText('Creating account...')).toBeInTheDocument()
    })

    it('should disable submit button when loading', () => {
      mockStore.loading = true
      renderRegisterPage()
      expect(screen.getByTestId('register-submit')).toBeDisabled()
    })
  })

  describe('Form Submission', () => {
    it('should call register with username, email, and password', async () => {
      renderRegisterPage()
      fireEvent.change(screen.getByTestId('register-username'), { target: { value: 'newuser' } })
      fireEvent.change(screen.getByTestId('register-email'), { target: { value: 'new@test.com' } })
      fireEvent.change(screen.getByTestId('register-password'), { target: { value: 'pass123' } })
      fireEvent.click(screen.getByTestId('register-submit'))

      await waitFor(() => {
        expect(mockStore.register).toHaveBeenCalledWith('newuser', 'new@test.com', 'pass123')
      })
    })
  })

  describe('Error Display', () => {
    it('should display error message when error exists', () => {
      mockStore.error = 'Username already taken'
      renderRegisterPage()
      expect(screen.getByTestId('register-error')).toBeInTheDocument()
      expect(screen.getByText('Username already taken')).toBeInTheDocument()
    })

    it('should not display error message when error is null', () => {
      renderRegisterPage()
      expect(screen.queryByTestId('register-error')).not.toBeInTheDocument()
    })

    it('should call clearError when typing in username field with existing error', () => {
      mockStore.error = 'Some error'
      renderRegisterPage()
      fireEvent.change(screen.getByTestId('register-username'), { target: { value: 'a' } })
      expect(mockStore.clearError).toHaveBeenCalled()
    })

    it('should call clearError when typing in email field with existing error', () => {
      mockStore.error = 'Some error'
      renderRegisterPage()
      fireEvent.change(screen.getByTestId('register-email'), { target: { value: 'a@b.com' } })
      expect(mockStore.clearError).toHaveBeenCalled()
    })

    it('should call clearError when typing in password field with existing error', () => {
      mockStore.error = 'Some error'
      renderRegisterPage()
      fireEvent.change(screen.getByTestId('register-password'), { target: { value: 'a' } })
      expect(mockStore.clearError).toHaveBeenCalled()
    })
  })

  describe('Navigation Links', () => {
    it('should render login link', () => {
      renderRegisterPage()
      expect(screen.getByTestId('register-login-link')).toBeInTheDocument()
    })

    it('should link to login page', () => {
      renderRegisterPage()
      const link = screen.getByTestId('register-login-link')
      expect(link).toHaveAttribute('href', '/login')
    })
  })
})

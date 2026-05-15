import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { HelmetProvider } from 'react-helmet-async'
import { LoginPage } from '../LoginPage'
import { MemoryRouter } from 'react-router-dom'

interface MockAuthStore {
  login: ReturnType<typeof vi.fn>
  loading: boolean
  error: string | null
  clearError: ReturnType<typeof vi.fn>
  isAuthenticated: boolean
}

const mockStore: MockAuthStore = {
  login: vi.fn().mockResolvedValue(undefined),
  loading: false,
  error: null,
  clearError: vi.fn(),
  isAuthenticated: false,
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

const renderLoginPage = () =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </HelmetProvider>
  )

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore.loading = false
    mockStore.error = null
    mockStore.isAuthenticated = false
    mockStore.login.mockResolvedValue(undefined)
  })

  describe('Initial Render', () => {
    it('should render login page container', () => {
      renderLoginPage()
      expect(screen.getByTestId('login-page')).toBeInTheDocument()
    })

    it('should render page title', () => {
      renderLoginPage()
      expect(screen.getByText('Welcome Back')).toBeInTheDocument()
    })

    it('should render subtitle', () => {
      renderLoginPage()
      expect(screen.getByText('Sign in to your account')).toBeInTheDocument()
    })
  })

  describe('Form Inputs', () => {
    it('should render username input', () => {
      renderLoginPage()
      expect(screen.getByTestId('login-username')).toBeInTheDocument()
    })

    it('should render password input', () => {
      renderLoginPage()
      expect(screen.getByTestId('login-password')).toBeInTheDocument()
    })

    it('should render submit button', () => {
      renderLoginPage()
      expect(screen.getByTestId('login-submit')).toBeInTheDocument()
    })

    it('should show Sign In text when not loading', () => {
      renderLoginPage()
      expect(screen.getByTestId('login-submit')).toHaveTextContent('Sign In')
    })

    it('should show Signing in... text when loading', () => {
      mockStore.loading = true
      renderLoginPage()
      expect(screen.getByText('Signing in...')).toBeInTheDocument()
    })

    it('should disable submit button when loading', () => {
      mockStore.loading = true
      renderLoginPage()
      expect(screen.getByTestId('login-submit')).toBeDisabled()
    })
  })

  describe('Form Submission', () => {
    it('should call login with username and password', async () => {
      renderLoginPage()
      fireEvent.change(screen.getByTestId('login-username'), { target: { value: 'testuser' } })
      fireEvent.change(screen.getByTestId('login-password'), { target: { value: 'pass123' } })
      fireEvent.click(screen.getByTestId('login-submit'))

      await waitFor(() => {
        expect(mockStore.login).toHaveBeenCalledWith('testuser', 'pass123')
      })
    })
  })

  describe('Error Display', () => {
    it('should display error message when error exists', () => {
      mockStore.error = 'Invalid credentials'
      renderLoginPage()
      expect(screen.getByTestId('login-error')).toBeInTheDocument()
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    })

    it('should not display error message when error is null', () => {
      renderLoginPage()
      expect(screen.queryByTestId('login-error')).not.toBeInTheDocument()
    })

    it('should call clearError when typing in username field with existing error', () => {
      mockStore.error = 'Some error'
      renderLoginPage()
      fireEvent.change(screen.getByTestId('login-username'), { target: { value: 'a' } })
      expect(mockStore.clearError).toHaveBeenCalled()
    })

    it('should call clearError when typing in password field with existing error', () => {
      mockStore.error = 'Some error'
      renderLoginPage()
      fireEvent.change(screen.getByTestId('login-password'), { target: { value: 'a' } })
      expect(mockStore.clearError).toHaveBeenCalled()
    })
  })

  describe('Quick Demo Login', () => {
    it('should pre-fill username and password from preset credentials', () => {
      renderLoginPage()
      const usernameInput = screen.getByTestId('login-username') as HTMLInputElement
      const passwordInput = screen.getByTestId('login-password') as HTMLInputElement
      expect(usernameInput.value).toBe('demo@biomimic.app')
      expect(passwordInput.value).toBe('demo123')
    })
  })

  describe('Navigation Links', () => {
    it('should render register link', () => {
      renderLoginPage()
      expect(screen.getByTestId('login-register-link')).toBeInTheDocument()
    })

    it('should link to register page', () => {
      renderLoginPage()
      const link = screen.getByTestId('login-register-link')
      expect(link).toHaveAttribute('href', '/register')
    })
  })
})

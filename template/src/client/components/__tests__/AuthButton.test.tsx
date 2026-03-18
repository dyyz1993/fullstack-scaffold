import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AuthButton } from '../AuthButton'

// Mock zustand
vi.mock('../../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))

import { useAuthStore } from '../../stores/authStore'

describe('AuthButton', () => {
  const mockSetToken = vi.fn()
  const mockLogout = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock window.location.reload
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { reload: vi.fn() },
    })
  })

  it('should show login button when not authenticated', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: false,
      logout: mockLogout,
    } as unknown as ReturnType<typeof useAuthStore>)

    render(<AuthButton />)

    expect(screen.getByText('登录')).toBeInTheDocument()
    expect(screen.queryByText('退出')).not.toBeInTheDocument()
  })

  it('should show logout button when authenticated', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
      logout: mockLogout,
    } as unknown as ReturnType<typeof useAuthStore>)

    render(<AuthButton />)

    expect(screen.getByText('已登录')).toBeInTheDocument()
    expect(screen.getByText('退出')).toBeInTheDocument()
    expect(screen.queryByText('登录')).not.toBeInTheDocument()
  })

  it('should call setToken and reload on login', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: false,
      logout: mockLogout,
      setToken: mockSetToken,
    } as unknown as ReturnType<typeof useAuthStore>)

    render(<AuthButton />)

    fireEvent.click(screen.getByText('登录'))

    expect(mockSetToken).toHaveBeenCalledWith('user-token')
    expect(window.location.reload).toHaveBeenCalled()
  })

  it('should call logout and reload on logout', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
      logout: mockLogout,
    } as unknown as ReturnType<typeof useAuthStore>)

    render(<AuthButton />)

    fireEvent.click(screen.getByText('退出'))

    expect(mockLogout).toHaveBeenCalled()
    expect(window.location.reload).toHaveBeenCalled()
  })
})

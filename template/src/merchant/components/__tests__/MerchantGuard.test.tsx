import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { MerchantGuard } from '../MerchantGuard'

const mockMerchantState = {
  isAuthenticated: false as boolean,
  merchant: null as { id: string; name: string } | null,
}

vi.mock('../../stores/merchantStore', () => ({
  useMerchantStore: <T,>(selector?: (state: typeof mockMerchantState) => T) => {
    if (selector) return selector(mockMerchantState)
    return mockMerchantState
  },
}))

function renderWithRouter(ui: React.ReactElement, initialPath = '/protected') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div data-testid="login-page">Login</div>} />
        <Route path="/protected" element={ui} />
      </Routes>
    </MemoryRouter>
  )
}

describe('MerchantGuard', () => {
  beforeEach(() => {
    mockMerchantState.isAuthenticated = false
    mockMerchantState.merchant = null
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('should redirect to /login when not authenticated', () => {
    renderWithRouter(
      <MerchantGuard>
        <div>Protected Content</div>
      </MerchantGuard>
    )

    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  it('should redirect to /login when merchant is null', () => {
    mockMerchantState.isAuthenticated = true
    mockMerchantState.merchant = null

    renderWithRouter(
      <MerchantGuard>
        <div>Protected Content</div>
      </MerchantGuard>
    )

    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  it('should render children when authenticated with merchant', () => {
    mockMerchantState.isAuthenticated = true
    mockMerchantState.merchant = { id: 'merchant-1', name: 'Test Merchant' }

    renderWithRouter(
      <MerchantGuard>
        <div data-testid="protected">Protected Content</div>
      </MerchantGuard>
    )

    expect(screen.getByTestId('protected')).toBeInTheDocument()
  })

  it('should render children when both isAuthenticated and merchant are set', () => {
    mockMerchantState.isAuthenticated = true
    mockMerchantState.merchant = { id: 'merchant-2', name: 'Another Merchant' }

    renderWithRouter(
      <MerchantGuard>
        <div data-testid="protected">Protected Content</div>
      </MerchantGuard>
    )

    expect(screen.getByTestId('protected')).toBeInTheDocument()
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument()
  })

  it('should redirect to /login when authenticated but merchant is null', () => {
    mockMerchantState.isAuthenticated = true
    mockMerchantState.merchant = null

    renderWithRouter(
      <MerchantGuard>
        <div data-testid="protected">Protected Content</div>
      </MerchantGuard>
    )

    expect(screen.getByTestId('login-page')).toBeInTheDocument()
    expect(screen.queryByTestId('protected')).not.toBeInTheDocument()
  })

  it('should redirect to /login when merchant is set but not authenticated', () => {
    mockMerchantState.isAuthenticated = false
    mockMerchantState.merchant = { id: 'merchant-1', name: 'Test Merchant' }

    renderWithRouter(
      <MerchantGuard>
        <div data-testid="protected">Protected Content</div>
      </MerchantGuard>
    )

    expect(screen.getByTestId('login-page')).toBeInTheDocument()
    expect(screen.queryByTestId('protected')).not.toBeInTheDocument()
  })
})

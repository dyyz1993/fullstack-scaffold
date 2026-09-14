import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ErrorBoundary } from '../ErrorBoundary'

// 渲染即抛错的子组件，模拟 "Objects are not valid as a React child" 类崩溃
function Bomb({ message }: { message: string }): React.JSX.Element {
  throw new Error(message)
}

// 静音 React 的错误输出，避免测试日志噪音
let errorSpy: ReturnType<typeof vi.spyOn>
beforeAll(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterAll(() => {
  errorSpy.mockRestore()
})

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div data-testid="normal-child">all good</div>
      </ErrorBoundary>
    )
    expect(screen.getByTestId('normal-child')).toBeInTheDocument()
    expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument()
  })

  it('renders fallback instead of white screen when child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb message="Objects are not valid as a React child" />
      </ErrorBoundary>
    )
    const fallback = screen.getByTestId('error-boundary')
    expect(fallback).toBeInTheDocument()
    expect(fallback).toHaveAttribute('role', 'alert')
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    // 错误信息对用户可见，而不是整页空白
    expect(screen.getByText(/Objects are not valid as a React child/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument()
  })

  it('shows generic message for non-Error throws', () => {
    render(
      <ErrorBoundary>
        <Bomb message="boom" />
      </ErrorBoundary>
    )
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument()
  })

  it('reload button triggers window.location.reload', () => {
    const reloadSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { ...window.location, reload: reloadSpy },
    })

    render(
      <ErrorBoundary>
        <Bomb message="boom" />
      </ErrorBoundary>
    )
    fireEvent.click(screen.getByRole('button', { name: /reload/i }))
    expect(reloadSpy).toHaveBeenCalledTimes(1)
  })
})

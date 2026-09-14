import { Component } from 'react'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  message: string | null
}

/**
 * 全局错误边界：捕获渲染期异常，展示可恢复的兜底 UI，
 * 避免 "Objects are not valid as a React child" 之类的渲染错误
 * 把整页打白。api-error.ts 的容错解析是第一道防线，这里是兜底。
 *
 * SSR 安全：renderToString 阶段不会触发 componentDidCatch，
 * fallback 只会在浏览器端出现；fallback 里也不做 window 直接访问。
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: null }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Unexpected error',
    }
  }

  componentDidCatch(error: unknown): void {
    // 保留控制台痕迹便于排查（生产环境同样输出错误摘要）
    if (error instanceof Error) {
      console.error('[ErrorBoundary]', error.message)
    }
  }

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-[50vh] flex flex-col items-center justify-center gap-4 p-8 text-gray-600"
          data-testid="error-boundary"
          role="alert"
        >
          <h1 className="text-xl font-semibold text-gray-900">Something went wrong</h1>
          <p className="text-sm text-gray-500 max-w-md text-center break-words">
            {this.state.message ?? 'An unexpected error occurred.'}
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            Reload page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

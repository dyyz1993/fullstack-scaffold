import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

/**
 * 移动端登录入口条（仅 md 以下显示）。
 * 桌面导航 md 起才渲染，此前移动端（含底部 tab）没有任何登录/登出途径，
 * 登出后只能靠清 localStorage 恢复。
 *
 * 刻意不依赖 authStore：本组件被 Layout 静态引用，需在无 auth 模块的
 * preset（如 ecommerce，不渲染此条）也可编译。登录态直接读 zustand
 * persist 写入的 localStorage，并以 popstate/focus/轮询做轻同步。
 */

function readAuthed(): { authed: boolean; username: string | null } {
  try {
    const raw = localStorage.getItem('auth-token')
    const state = raw ? JSON.parse(raw)?.state : null
    return { authed: !!state?.isAuthenticated, username: state?.user?.username ?? null }
  } catch {
    return { authed: false, username: null }
  }
}

export function MobileAuthBar() {
  const [snap, setSnap] = useState(readAuthed)
  const location = useLocation()

  useEffect(() => {
    const sync = () => setSnap(readAuthed())
    window.addEventListener('popstate', sync)
    window.addEventListener('focus', sync)
    const timer = window.setInterval(sync, 1200)
    return () => {
      window.removeEventListener('popstate', sync)
      window.removeEventListener('focus', sync)
      window.clearInterval(timer)
    }
  }, [])

  // 登录/注册页本身不需要再给入口
  if (location.pathname === '/login' || location.pathname === '/register') return null

  const handleSignOut = () => {
    try {
      const raw = localStorage.getItem('auth-token')
      if (!raw) return
      const parsed = JSON.parse(raw)
      parsed.state = { ...parsed.state, token: null, isAuthenticated: false, user: null }
      localStorage.setItem('auth-token', JSON.stringify(parsed))
    } catch {
      localStorage.removeItem('auth-token')
    }
    setSnap({ authed: false, username: null })
    window.location.href = '/login'
  }

  if (snap.authed) {
    return (
      <div
        className="md:hidden bg-white/90 backdrop-blur-sm border-b border-gray-100 px-4 py-2 flex items-center justify-end gap-2"
        data-testid="mobile-auth-bar"
      >
        <span className="text-sm text-gray-600" data-testid="mobile-auth-username">
          {snap.username ?? 'User'}
        </span>
        <button
          onClick={handleSignOut}
          data-testid="mobile-auth-logout"
          className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
        >
          Sign Out
        </button>
      </div>
    )
  }

  return (
    <div
      className="md:hidden bg-white/90 backdrop-blur-sm border-b border-gray-100 px-4 py-2 flex items-center justify-end gap-2"
      data-testid="mobile-auth-bar"
    >
      <Link
        to="/login"
        data-testid="mobile-auth-login"
        className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Sign In
      </Link>
      <Link
        to="/register"
        data-testid="mobile-auth-register"
        className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
      >
        Sign Up
      </Link>
    </div>
  )
}

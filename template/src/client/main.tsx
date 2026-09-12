/* eslint-disable react-refresh/only-export-components */
import React from 'react'
import ReactDOM from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { App as ClientApp } from './App'
import './index.css'

const preset = import.meta.env.VITE_PRESET || 'todo'

// Demo 登录令牌：仅供开发服务器开箱体验（e2e 也依赖）；生产构建
// （import.meta.env.DEV === false）不注入，用户走正常注册/登录。
// 仅在 localStorage 完全没有 auth-token 键时注入（首次访问），
// 用户登出后（键存在但 token 为空）不再重新播种。
if (preset !== 'saas' && import.meta.env.DEV) {
  if (localStorage.getItem('auth-token') === null) {
    localStorage.setItem(
      'auth-token',
      JSON.stringify({
        state: {
          token: 'user-token',
          isAuthenticated: true,
          user: { id: 'user-1', username: 'Demo User', role: 'USER' },
          loading: false,
          error: null,
        },
        version: 0,
      })
    )
  }
}

const AdminApp = React.lazy(() => import('@admin/App').then(m => ({ default: m.App })))

const RootApp = () => {
  if (preset === 'saas') {
    return (
      <React.Suspense
        fallback={
          <div className="flex items-center justify-center h-screen text-gray-400">Loading...</div>
        }
      >
        <AdminApp basePath="/" />
      </React.Suspense>
    )
  }

  return (
    <HelmetProvider>
      <ClientApp presetId={preset} />
    </HelmetProvider>
  )
}

// 水合：SSR（ISR 管线）已输出 #root 内的 HTML——hydrateRoot 复用而非
// 重画（SEO/首屏收益成立的前提）。无 SSR 的普通访问 fallback createRoot。
const rootEl = document.getElementById('root')!
const hasSsrMarkup = rootEl.hasChildNodes()
if (hasSsrMarkup) {
  ReactDOM.hydrateRoot(
    rootEl,
    <React.StrictMode>
      <RootApp />
    </React.StrictMode>
  )
} else {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <RootApp />
    </React.StrictMode>
  )
}

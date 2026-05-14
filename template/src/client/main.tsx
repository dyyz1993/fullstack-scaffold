/* eslint-disable react-refresh/only-export-components */
import React from 'react'
import ReactDOM from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { App as ClientApp } from './App'
import './index.css'

const preset = import.meta.env.VITE_PRESET || 'todo'

if (preset !== 'saas') {
  try {
    const raw = localStorage.getItem('auth-token')
    const parsed = raw ? JSON.parse(raw) : null
    if (!parsed?.state?.token) {
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
  } catch {
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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>
)

if (typeof window !== 'undefined') {
  requestAnimationFrame(() => {
    setTimeout(() => {
      document.dispatchEvent(new CustomEvent('prerender-ready'))
    }, 100)
  })
}

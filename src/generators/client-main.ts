import type { ResolvedPreset } from './template-generator'

function getPresetType(presetId: string): string {
  const map: Record<string, string> = {
    'todo-app': 'todo',
    'xbrowser-marketplace': 'plugin',
    ecommerce: 'ecommerce',
    'fullstack-admin': 'saas',
    minimal: 'todo',
  }
  return map[presetId] || 'todo'
}

export function generateClientMain(resolved: ResolvedPreset, presetId: string): string {
  const presetType = getPresetType(presetId)
  const isSaas = presetType === 'saas'

  const authTokenBlock = isSaas
    ? ''
    : `
if (preset !== 'saas') {
  try {
    const raw = localStorage.getItem('auth-token')
    const parsed = raw ? JSON.parse(raw) : null
    if (!parsed?.state?.token) {
      localStorage.setItem('auth-token', JSON.stringify({
        state: {
          token: 'user-token',
          isAuthenticated: true,
          user: { id: 'user-1', username: 'Demo User', role: 'USER' },
          loading: false,
          error: null,
        },
        version: 0,
      }))
    }
  } catch {
    localStorage.setItem('auth-token', JSON.stringify({
      state: { token: 'user-token', isAuthenticated: true, user: { id: 'user-1', username: 'Demo User', role: 'USER' }, loading: false, error: null },
      version: 0,
    }))
  }
}
`

  if (isSaas) {
    return `import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

const AdminApp = React.lazy(() => import('@admin/App').then(m => ({ default: m.App })))

const RootApp = () => {
  return (
    <React.Suspense fallback={<div className="flex items-center justify-center h-screen text-gray-400">Loading...</div>}>
      <AdminApp basePath="/" />
    </React.Suspense>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>,
)

if (typeof window !== 'undefined') {
  requestAnimationFrame(() => {
    setTimeout(() => {
      document.dispatchEvent(new CustomEvent('prerender-ready'))
    }, 100)
  })
}
`
  }

  return `import React from 'react'
import ReactDOM from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { App as ClientApp } from './App'
import './index.css'

const preset = import.meta.env.VITE_PRESET || '${presetType}'
${authTokenBlock}
const RootApp = () => {
  return (
    <HelmetProvider>
      <ClientApp presetId={preset} />
    </HelmetProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>,
)

if (typeof window !== 'undefined') {
  requestAnimationFrame(() => {
    setTimeout(() => {
      document.dispatchEvent(new CustomEvent('prerender-ready'))
    }, 100)
  })
}
`
}

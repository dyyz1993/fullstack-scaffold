/**
 * Generates admin/App.tsx content based on resolved preset
 */
import type { ResolvedPreset } from './template-generator'
import { getAdminPages } from './template-generator'

export function generateAdminApp(resolved: ResolvedPreset): string | null {
  if (!resolved.hasAdmin) return null

  const pages = getAdminPages(resolved) ?? []
  if (pages.length === 0) return null

  // Separate public and protected pages
  const publicPages = pages.filter(p => p.isPublic)
  const protectedPages = pages.filter(p => !p.isPublic)

  // Build imports
  const imports = [
    `import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'`,
    `import { ConfigProvider } from 'antd'`,
    `import { Layout } from './layouts/Layout'`,
  ]

  for (const page of pages) {
    imports.push(`import { ${page.name} } from './pages/${page.name}'`)
  }

  // CaptchaModal only if captcha module is included
  const captchaImport = resolved.hasCaptcha ? ', CaptchaModal' : ''
  imports.push(`import { ProtectedRoute${captchaImport} } from './components'`)

  // Build protected route elements
  const protectedRouteElements = protectedPages.map(
    p => `                    <Route path="${p.route}" element={<${p.name} />} />`
  )

  const defaultProtectedRoute = protectedPages.length > 0 ? protectedPages[0].route : '/'

  const captchaElement = resolved.hasCaptcha ? `\n        <CaptchaModal />` : ''

  const publicRouteLines = publicPages.map(
    p => `          <Route path="${p.route}" element={<${p.name} />} />`
  )

  return `${imports.join('\n')}

export const App: React.FC<{ basePath?: string }> = ({ basePath = '/admin' }) => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff',
        },
      }}
    >
      <BrowserRouter basename={basePath}>
        <Routes>
${publicRouteLines.join('\n')}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Navigate to="${defaultProtectedRoute}" replace />} />
${protectedRouteElements.join('\n')}
                    <Route path="/system/monitor" element={<div className="p-6"><h2 className="text-xl font-semibold">System Monitor</h2><p className="text-gray-500 mt-2">Coming soon...</p></div>} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>${captchaElement}
      </BrowserRouter>
    </ConfigProvider>
  )
}
`
}

/**
 * Generates admin/components/index.ts content based on resolved preset.
 * Conditionally includes CaptchaModal only when captcha module is present.
 */
export function generateAdminComponentsIndex(resolved: ResolvedPreset): string | null {
  if (!resolved.hasAdmin) return null

  const lines = [
    `export { UserTable } from './UserTable'`,
    `export { StatsCard } from './StatsCard'`,
    `export { PageHeader } from './PageHeader'`,
    `export { UserFormModal } from './UserFormModal'`,
    `export { ProtectedRoute } from './ProtectedRoute'`,
  ]

  if (resolved.hasCaptcha) {
    lines.push(`export { CaptchaModal } from './CaptchaModal'`)
  }

  lines.push(`export { PermissionGuard, PermissionButton, Can, Cannot } from './PermissionGuard'`)

  return lines.join('\n') + '\n'
}

/**
 * Generates admin/services/apiClient.ts content based on resolved preset.
 * Conditionally imports captchaStore only when captcha module is present.
 */
export function generateAdminApiClient(resolved: ResolvedPreset): string | null {
  if (!resolved.hasAdmin) return null

  const captchaImport = resolved.hasCaptcha
    ? `import { useCaptchaStore } from '../stores/captchaStore'\n`
    : ''
  const captchaFetchSetup = resolved.hasCaptcha
    ? `  const showCaptcha = useCaptchaStore.getState().show\n\n`
    : ''
  const captchaHandler = resolved.hasCaptcha
    ? `    onShowCaptcha: async config => {
      return showCaptcha({
        type: config.type,
        captchaUrl: config.captchaUrl,
      })
    },`
    : `    onShowCaptcha: async () => true,`

  return `/**
 * @framework-baseline ab16e97716a7556e
 * @framework-modify
 * @reason Conditional captcha support based on preset modules
 * @impact Captcha module excluded = no captchaStore import
 */

import { hc } from 'hono/client'
import { WSClientImpl } from '@shared/core/ws-client'
import { SSEClientImpl } from '@shared/core/sse-client'
import { createRequestInterceptor } from './requestInterceptor'
${captchaImport}import type { AdminApiType } from '@server/index'

const baseUrl = import.meta.env.API_BASE_URL || window.location.origin

const TOKEN_KEY = 'admin-storage'

function clearAuthAndRedirect(): void {
  localStorage.removeItem(TOKEN_KEY)
  if (window.location.pathname !== '/admin/login') {
    window.location.href = '/admin/login'
  }
}

function getAuthToken(): string | null {
  try {
    const stored = localStorage.getItem(TOKEN_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed.state?.token || null
    }
  } catch {
    return null
  }
  return null
}

function createCustomFetch() {
${captchaFetchSetup}  return createRequestInterceptor({
    onShowLogin: clearAuthAndRedirect,
${captchaHandler}  })
}

export const apiClient = hc<AdminApiType>(baseUrl, {
  fetch: createCustomFetch() as typeof fetch,
  webSocket: url => new WSClientImpl(url) as unknown as WebSocket,
  sse: url => {
    const token = getAuthToken()
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = \`Bearer \${token}\`
    }
    return new SSEClientImpl(url, headers)
  },
})

export { api } from '@shared/core/api-request'
`
}

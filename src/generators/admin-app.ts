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

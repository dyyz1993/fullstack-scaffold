/**
 * Generates client/App.tsx content based on resolved preset
 */
import type { ResolvedPreset } from './template-generator'
import { getClientPages, getDefaultRoute } from './template-generator'

export function generateClientApp(resolved: ResolvedPreset): string {
  const pages = getClientPages(resolved)
  const defaultRoute = getDefaultRoute(resolved)

  // Build imports
  const imports = [
    `import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'`,
    `import { Layout } from './Layout'`,
  ]

  for (const page of pages) {
    imports.push(`import { ${page.name} } from './pages/${page.name}'`)
  }

  // Build routes
  const routeElements: string[] = []
  routeElements.push(
    `          <Route path="/" element={<Navigate to="${defaultRoute}" replace />} />`
  )

  for (const page of pages) {
    routeElements.push(`          <Route path="${page.route}" element={<${page.name} />} />`)
  }

  return `${imports.join('\n')}

export function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
${routeElements.join('\n')}
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
`
}

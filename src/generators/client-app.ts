import type { ResolvedPreset } from './template-generator'
import { getClientPages, getDefaultRoute } from './template-generator'

export function generateClientApp(resolved: ResolvedPreset): string {
  const pages = getClientPages(resolved)
  const defaultRoute = getDefaultRoute(resolved)

  const rawPresetId = resolved.preset.id
  const presetId =
    rawPresetId === 'todo-app'
      ? 'todo'
      : rawPresetId === 'xbrowser-marketplace'
      ? 'plugin'
      : rawPresetId === 'ecommerce'
      ? 'ecommerce'
      : rawPresetId === 'community'
      ? 'community'
      : 'saas'

  const imports = [
    `import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'`,
    `import { Layout } from './Layout'`,
    `import { getPresetUIConfig } from './preset-ui-config'`,
    `import type { PresetType } from './preset-ui-config'`,
  ]

  for (const page of pages) {
    imports.push(`import { ${page.name} } from './pages/${page.name}'`)
  }

  const routeElements: string[] = []
  routeElements.push(
    `          <Route path="/" element={<Navigate to="${defaultRoute}" replace />} />`
  )

  for (const page of pages) {
    routeElements.push(`          <Route path="${page.route}" element={<${page.name} />} />`)
  }

  return `${imports.join('\n')}

export function App() {
  const presetId: PresetType = '${presetId}'
  const config = getPresetUIConfig(presetId)

  return (
    <BrowserRouter>
      <Layout
        preset={presetId}
        theme={config.theme}
        desktopNav={config.desktopNav}
        mobileTabs={config.mobileTabs}
      >
        <Routes>
${routeElements.join('\n')}
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
`
}

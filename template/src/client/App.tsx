import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './Layout'
import {
  getPresetUIConfig,
  getPresetUIConfigs,
  type PresetType,
  type RouteDef,
} from './preset-ui-config'

function getAllRoutes(): RouteDef[] {
  const configs = getPresetUIConfigs()
  const seen = new Set<string>()
  const allRoutes: RouteDef[] = []
  for (const config of Object.values(configs)) {
    for (const route of config.routes) {
      if (!seen.has(route.path)) {
        seen.add(route.path)
        allRoutes.push(route)
      }
    }
  }
  return allRoutes
}

export const App: React.FC<{ presetId?: PresetType }> = ({ presetId }) => {
  const activeConfig = presetId ? getPresetUIConfig(presetId) : undefined
  const allRoutes = getAllRoutes()
  const defaultRoute = activeConfig?.defaultRoute ?? '/todos'
  const theme = activeConfig?.theme ?? getPresetUIConfig('todo').theme
  const desktopNav = activeConfig?.desktopNav ?? []
  const mobileTabs = activeConfig?.mobileTabs ?? []

  return (
    <BrowserRouter>
      <Layout
        preset={presetId ?? 'todo'}
        theme={theme}
        desktopNav={desktopNav}
        mobileTabs={mobileTabs}
      >
        <Routes>
          <Route path="/" element={<Navigate to={defaultRoute} replace />} />
          {allRoutes
            .filter(
              (r): r is RouteDef & { component: NonNullable<RouteDef['component']> } =>
                r.component !== null
            )
            .map(route => (
              <Route key={route.path} path={route.path} element={<route.component />} />
            ))}
          <Route
            path="*"
            element={
              <div className="flex items-center justify-center min-h-[50vh] text-gray-400">
                404 - Page not found
              </div>
            }
          />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

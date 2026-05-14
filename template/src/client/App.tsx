import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './Layout'
import { getPresetUIConfig, type PresetType, type RouteDef } from './preset-ui-config'

export const App: React.FC<{ presetId?: PresetType }> = ({ presetId = 'saas' }) => {
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
          <Route path="/" element={<Navigate to={config.defaultRoute} replace />} />
          {config.routes
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

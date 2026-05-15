import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './Layout'
import { PresetProvider } from './contexts/PresetContext'
import { getPresetUIConfig, type RouteDef } from './preset-ui-config'

export const App: React.FC<{ presetId?: string }> = ({ presetId = 'todo' }) => {
  const config = getPresetUIConfig(presetId)
  const { theme, desktopNav, mobileTabs, defaultRoute, routes, layout, navigation } = config

  return (
    <BrowserRouter>
      <PresetProvider value={presetId}>
        <Layout
          preset={presetId}
          layout={layout}
          theme={theme}
          navigation={navigation}
          desktopNav={desktopNav}
          mobileTabs={mobileTabs}
        >
          <Routes>
            {defaultRoute !== '/' && (
              <Route path="/" element={<Navigate to={defaultRoute} replace />} />
            )}
            {routes
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
      </PresetProvider>
    </BrowserRouter>
  )
}

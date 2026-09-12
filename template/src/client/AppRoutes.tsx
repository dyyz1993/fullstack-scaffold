import { Suspense } from 'react'
import { Routes, Route, Navigate, Link } from 'react-router-dom'
import { Layout } from './Layout'
import { PresetProvider } from './contexts/PresetContext'
import { getPresetUIConfig, type RouteDef } from './preset-ui-config'

export const AppRoutes: React.FC<{ presetId?: string }> = ({ presetId = 'todo' }) => {
  const config = getPresetUIConfig(presetId)
  const { theme, desktopNav, mobileTabs, defaultRoute, routes, layout, navigation } = config

  return (
    <PresetProvider value={presetId}>
      <Layout
        preset={presetId}
        layout={layout}
        theme={theme}
        navigation={navigation}
        desktopNav={desktopNav}
        mobileTabs={mobileTabs}
      >
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[50vh] text-gray-400">
              Loading...
            </div>
          }
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
                <div
                  className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-gray-400"
                  data-testid="not-found-page"
                >
                  <div>404 - Page not found</div>
                  <Link
                    to="/"
                    className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm transition-colors"
                  >
                    ← Back to Home
                  </Link>
                </div>
              }
            />
          </Routes>
        </Suspense>
      </Layout>
    </PresetProvider>
  )
}

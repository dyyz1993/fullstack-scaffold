import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Download, Package, Calendar, User, Trash2, LogIn } from 'lucide-react'
import { usePluginStore } from '@client/stores/pluginStore'
import { useAuthStore } from '@client/stores/authStore'
import { LoadingSpinner, EmptyState, StatusBadge } from '@client/components'

export const MyInstallsPage: React.FC = () => {
  const installedPlugins = usePluginStore(state => state.installedPlugins)
  const loading = usePluginStore(state => state.loading)
  const error = usePluginStore(state => state.error)
  const fetchInstalledPlugins = usePluginStore(state => state.fetchInstalledPlugins)
  const uninstallPlugin = usePluginStore(state => state.uninstallPlugin)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const [uninstalling, setUninstalling] = useState<string | null>(null)

  useEffect(() => {
    // 未登录时静默展示引导（不触发 401 → /login 跳转）
    if (isAuthenticated) {
      fetchInstalledPlugins()
    }
  }, [isAuthenticated, fetchInstalledPlugins])

  const handleUninstall = async (slug: string) => {
    if (uninstalling) return
    setUninstalling(slug)
    await uninstallPlugin(slug)
    setUninstalling(null)
  }

  return (
    <div className="min-h-screen" data-testid="my-installs-page">
      <Helmet>
        <title>My Installs - Plugin Marketplace</title>
        <meta name="description" content="Plugins you have installed" />
      </Helmet>

      <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pt-12 pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl shadow-lg shadow-violet-500/25">
              <Download className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">My Installs</h1>
          </div>
          <p className="text-purple-200/70 text-lg max-w-xl">
            Plugins you have installed. Uninstall anytime — your list stays in sync across visits.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-8 pb-16">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-300 rounded-2xl backdrop-blur-sm">
            {error}
          </div>
        )}

        {!isAuthenticated ? (
          <div className="bg-white rounded-2xl shadow-xl shadow-black/5 border border-gray-100 p-10">
            <EmptyState
              icon={LogIn}
              title="Sign in to see your installed plugins"
              description="Your install history is tied to your account."
            />
            <div className="mt-6 flex justify-center">
              <Link
                to="/login"
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl hover:from-violet-400 hover:to-fuchsia-400 transition-all shadow-lg shadow-violet-500/25 text-sm font-semibold"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </Link>
            </div>
          </div>
        ) : loading && installedPlugins.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : installedPlugins.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl shadow-black/5 border border-gray-100 p-10">
            <EmptyState
              icon={Package}
              title="No installs yet"
              description="Browse the marketplace and install your first plugin."
            />
            <div className="mt-6 flex justify-center">
              <Link
                to="/plugins"
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl hover:from-violet-400 hover:to-fuchsia-400 transition-all shadow-lg shadow-violet-500/25 text-sm font-semibold"
              >
                <Package className="w-4 h-4" />
                Browse Plugins
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl shadow-black/5 border border-gray-100 divide-y divide-gray-100 overflow-hidden">
            {installedPlugins.map(plugin => (
              <div
                key={plugin.id}
                className="flex items-center gap-4 p-5 hover:bg-gray-50/80 transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center text-lg font-bold text-violet-600 shrink-0">
                  {plugin.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      to={`/plugins/${plugin.slug}`}
                      className="text-base font-semibold text-gray-900 hover:text-violet-700 transition-colors truncate"
                    >
                      {plugin.name}
                    </Link>
                    <StatusBadge label={`v${plugin.version}`} colorScheme="purple" />
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      {plugin.authorName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Installed {new Date(plugin.installedAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="w-3.5 h-3.5" />
                      {plugin.downloadCount} downloads
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleUninstall(plugin.slug)}
                  disabled={uninstalling === plugin.slug}
                  data-testid={`uninstall-${plugin.slug}`}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 hover:border-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0"
                >
                  {uninstalling === plugin.slug ? (
                    <LoadingSpinner size="sm" color="text-red-600" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Uninstall
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

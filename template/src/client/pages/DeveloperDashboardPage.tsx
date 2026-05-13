import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  Package,
  Trash2,
  ExternalLink,
  Plus,
  BarChart3,
  CheckCircle2,
  Clock,
  Download,
} from 'lucide-react'
import { usePluginStore } from '@client/stores/pluginStore'
import { LoadingSpinner, EmptyState, StatusBadge } from '@client/components'

export const DeveloperDashboardPage: React.FC = () => {
  const myPlugins = usePluginStore(state => state.myPlugins)
  const loading = usePluginStore(state => state.loading)
  const error = usePluginStore(state => state.error)
  const fetchMyPlugins = usePluginStore(state => state.fetchMyPlugins)
  const deletePlugin = usePluginStore(state => state.deletePlugin)
  const fetchStats = usePluginStore(state => state.fetchStats)

  useEffect(() => {
    fetchMyPlugins()
    fetchStats()
  }, [fetchMyPlugins, fetchStats])

  const statusColors: Record<string, 'green' | 'yellow' | 'red'> = {
    approved: 'green',
    pending: 'yellow',
    rejected: 'red',
  }

  const safePlugins = myPlugins?.filter(Boolean) ?? []
  const totalDownloads = safePlugins.reduce((sum, p) => sum + (p?.downloadCount ?? 0), 0)

  return (
    <div className="min-h-screen" data-testid="developer-dashboard-page">
      <Helmet>
        <title>Developer Dashboard - Plugin Marketplace</title>
        <meta name="description" content="Manage your published plugins" />
      </Helmet>

      <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pt-12 pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl shadow-lg shadow-violet-500/25">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">
                  Developer Dashboard
                </h1>
                <p className="text-purple-200/60 mt-0.5">Manage your published plugins</p>
              </div>
            </div>
            <Link
              to="/publish"
              className="group flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl hover:from-violet-400 hover:to-fuchsia-400 transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 text-sm font-semibold"
            >
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
              New Plugin
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-8 pb-16">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="relative overflow-hidden bg-white rounded-2xl shadow-lg shadow-black/5 border border-gray-100 p-5">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-fuchsia-500" />
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-50 rounded-lg">
                <Package className="w-5 h-5 text-violet-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">My Plugins</p>
                <p className="text-2xl font-bold text-gray-900">{safePlugins.length}</p>
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden bg-white rounded-2xl shadow-lg shadow-black/5 border border-gray-100 p-5">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Approved</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {safePlugins.filter(p => p.status === 'approved').length}
                </p>
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden bg-white rounded-2xl shadow-lg shadow-black/5 border border-gray-100 p-5">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-lg">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Pending</p>
                <p className="text-2xl font-bold text-amber-600">
                  {safePlugins.filter(p => p.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden bg-white rounded-2xl shadow-lg shadow-black/5 border border-gray-100 p-5">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Download className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Downloads</p>
                <p className="text-2xl font-bold text-blue-600">{totalDownloads}</p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-600 rounded-2xl">
            {error}
          </div>
        )}

        {loading && safePlugins.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : safePlugins.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl shadow-black/5 border border-gray-100 p-12">
            <EmptyState
              icon={Package}
              title="No plugins published yet"
              description="Publish your first plugin to get started"
            />
          </div>
        ) : (
          <div className="space-y-3">
            {safePlugins.map(plugin => (
              <div
                key={plugin.id}
                className="group bg-white rounded-2xl border border-gray-100 hover:border-violet-200 hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-300 p-5"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center text-lg font-bold text-violet-600 shrink-0">
                    {plugin.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-gray-900 group-hover:text-violet-700 transition-colors">
                        {plugin.name}
                      </h3>
                      <StatusBadge
                        label={plugin.status}
                        colorScheme={statusColors[plugin.status] || 'gray'}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">
                      {plugin.slug} &middot; v{plugin.version}
                    </p>
                    {plugin.status === 'rejected' && plugin.rejectReason && (
                      <p className="text-sm text-red-500 mt-1">Rejected: {plugin.rejectReason}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-2 line-clamp-2 leading-relaxed">
                      {plugin.description}
                    </p>
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Download className="w-3.5 h-3.5" />
                        {plugin.downloadCount} downloads
                      </span>
                      <span>{new Date(plugin.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Link
                      to={`/plugins/${plugin.slug}`}
                      className="p-2.5 text-gray-400 hover:text-violet-500 hover:bg-violet-50 rounded-xl transition-all"
                      title="View"
                    >
                      <ExternalLink className="w-4.5 h-4.5" />
                    </Link>
                    <button
                      onClick={() => {
                        if (confirm('Delete this plugin?')) {
                          deletePlugin(plugin.slug)
                        }
                      }}
                      className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

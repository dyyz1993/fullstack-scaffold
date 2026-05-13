import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Package, Trash2, ExternalLink, Plus } from 'lucide-react'
import { usePluginStore } from '@client/stores/pluginStore'
import { LoadingSpinner, EmptyState, StatusBadge } from '@client/components'

export const DeveloperDashboardPage: React.FC = () => {
  const myPlugins = usePluginStore(state => state.myPlugins)
  const loading = usePluginStore(state => state.loading)
  const error = usePluginStore(state => state.error)
  const fetchMyPlugins = usePluginStore(state => state.fetchMyPlugins)
  const deletePlugin = usePluginStore(state => state.deletePlugin)
  const stats = usePluginStore(state => state.stats)
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

  return (
    <div className="max-w-4xl mx-auto p-6" data-testid="developer-dashboard-page">
      <Helmet>
        <title>Developer Dashboard - Plugin Marketplace</title>
        <meta name="description" content="Manage your published plugins" />
      </Helmet>

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Developer Dashboard</h1>
          <p className="text-gray-500 mt-2">Manage your published plugins</p>
        </div>
        <Link
          to="/publish"
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Plugin
        </Link>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <p className="text-sm text-gray-500">My Plugins</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{myPlugins.length}</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <p className="text-sm text-gray-500">Approved</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {myPlugins.filter(p => p.status === 'approved').length}
            </p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">
              {myPlugins.filter(p => p.status === 'pending').length}
            </p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <p className="text-sm text-gray-500">Total Downloads</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {myPlugins.reduce((sum, p) => sum + p.downloadCount, 0)}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {loading && myPlugins.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : myPlugins.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No plugins published yet"
          description="Publish your first plugin to get started"
        />
      ) : (
        <div className="space-y-4">
          {myPlugins.map(plugin => (
            <div
              key={plugin.id}
              className="p-5 bg-white rounded-xl border border-gray-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-medium text-gray-900">{plugin.name}</h3>
                    <StatusBadge
                      label={plugin.status}
                      colorScheme={statusColors[plugin.status] || 'gray'}
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {plugin.slug} &middot; v{plugin.version}
                  </p>
                  {plugin.status === 'rejected' && plugin.rejectReason && (
                    <p className="text-sm text-red-500 mt-1">Rejected: {plugin.rejectReason}</p>
                  )}
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{plugin.description}</p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                    <span>{plugin.downloadCount} downloads</span>
                    <span>{new Date(plugin.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/plugins/${plugin.slug}`}
                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </Link>
                  <button
                    onClick={() => {
                      if (confirm('Delete this plugin?')) {
                        deletePlugin(plugin.slug)
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

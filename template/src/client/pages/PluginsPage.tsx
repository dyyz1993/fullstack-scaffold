import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Package, ChevronLeft, ChevronRight, Tag, Download } from 'lucide-react'
import { usePluginStore } from '@client/stores/pluginStore'
import { LoadingSpinner, EmptyState } from '@client/components'
import { StatusBadge } from '@client/components'

export const PluginsPage: React.FC = () => {
  const plugins = usePluginStore(state => state.plugins)
  const loading = usePluginStore(state => state.loading)
  const error = usePluginStore(state => state.error)
  const categories = usePluginStore(state => state.categories)
  const selectedCategory = usePluginStore(state => state.selectedCategory)
  const pagination = usePluginStore(state => state.pagination)
  const fetchPlugins = usePluginStore(state => state.fetchPlugins)
  const fetchCategories = usePluginStore(state => state.fetchCategories)
  const setSelectedCategory = usePluginStore(state => state.setSelectedCategory)

  useEffect(() => {
    fetchPlugins(1)
    fetchCategories()
  }, [fetchPlugins, fetchCategories])

  useEffect(() => {
    fetchPlugins(1)
  }, [selectedCategory, fetchPlugins])

  const totalPages = Math.ceil(pagination.total / pagination.limit)

  return (
    <div className="max-w-6xl mx-auto p-6" data-testid="plugins-page">
      <Helmet>
        <title>Plugin Marketplace - Biomimic App</title>
        <meta name="description" content="Browse and discover plugins for your application" />
      </Helmet>

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-8 h-8 text-blue-500" />
            Plugin Marketplace
          </h1>
          <p className="text-gray-500 mt-2">Browse and discover plugins for your application</p>
        </div>
        <Link
          to="/publish"
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
        >
          Publish Plugin
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex gap-8">
        <aside className="w-56 flex-shrink-0">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Categories</h3>
          <div className="space-y-1">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                !selectedCategory
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              All Plugins
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.slug)}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                  selectedCategory === cat.slug
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {cat.icon && <span className="mr-2">{cat.icon}</span>}
                {cat.name}
              </button>
            ))}
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          {loading && plugins.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : plugins.length === 0 ? (
            <EmptyState icon={Package} title="No plugins found" />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plugins.map(plugin => (
                  <Link
                    key={plugin.id}
                    to={`/plugins/${plugin.slug}`}
                    className="p-5 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all block"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {plugin.name}
                        </h3>
                        <p className="text-sm text-gray-500 mt-0.5">by {plugin.authorName}</p>
                      </div>
                      <StatusBadge label={`v${plugin.version}`} colorScheme="blue" />
                    </div>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{plugin.description}</p>
                    <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Download className="w-3.5 h-3.5" />
                        {plugin.downloadCount}
                      </span>
                      {plugin.tags && plugin.tags.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {plugin.tags.slice(0, 3).map(tag => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded"
                            >
                              <Tag className="w-3 h-3 mr-0.5" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <button
                    onClick={() => fetchPlugins(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {pagination.page} of {totalPages}
                  </span>
                  <button
                    onClick={() => fetchPlugins(pagination.page + 1)}
                    disabled={pagination.page >= totalPages}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

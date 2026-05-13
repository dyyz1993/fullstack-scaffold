import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  Package,
  ChevronLeft,
  ChevronRight,
  Tag,
  Download,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react'
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
    <div className="min-h-screen" data-testid="plugins-page">
      <Helmet>
        <title>Plugin Marketplace - Biomimic App</title>
        <meta name="description" content="Browse and discover plugins for your application" />
      </Helmet>

      <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pt-12 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl shadow-lg shadow-violet-500/25">
              <Package className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Plugin Marketplace</h1>
          </div>
          <p className="text-purple-200/70 text-lg max-w-xl">
            Extend your application with powerful plugins. Browse, install, and publish
            community-built extensions.
          </p>
          <div className="mt-6 flex items-center gap-4">
            <Link
              to="/publish"
              className="group flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl hover:from-violet-400 hover:to-fuchsia-400 transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 text-sm font-semibold"
            >
              <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              Publish Plugin
            </Link>
            <Link
              to="/search"
              className="flex items-center gap-2 px-5 py-2.5 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all text-sm font-medium backdrop-blur-sm border border-white/10"
            >
              Search Plugins
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-300 rounded-2xl backdrop-blur-sm">
            {error}
          </div>
        )}

        <div className="flex gap-8">
          <aside className="w-60 flex-shrink-0 hidden lg:block">
            <div className="bg-white rounded-2xl shadow-lg shadow-black/5 border border-gray-100 p-4 sticky top-6">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">
                Categories
              </h3>
              <div className="space-y-0.5">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full text-left px-3 py-2.5 text-sm rounded-xl transition-all flex items-center gap-2 ${
                    !selectedCategory
                      ? 'bg-gradient-to-r from-violet-50 to-fuchsia-50 text-violet-700 font-semibold shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  All Plugins
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.slug)}
                    className={`w-full text-left px-3 py-2.5 text-sm rounded-xl transition-all flex items-center gap-2 ${
                      selectedCategory === cat.slug
                        ? 'bg-gradient-to-r from-violet-50 to-fuchsia-50 text-violet-700 font-semibold shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-base">{cat.icon || '📁'}</span>
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            {loading && plugins.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <LoadingSpinner size="lg" />
              </div>
            ) : plugins.length === 0 ? (
              <EmptyState icon={Package} title="No plugins found" />
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <p className="text-sm text-gray-500">
                    <span className="font-semibold text-gray-700">{pagination.total}</span> plugins
                    available
                  </p>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Sorted by popularity
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {plugins.map(plugin => (
                    <Link
                      key={plugin.id}
                      to={`/plugins/${plugin.slug}`}
                      className="group relative p-5 bg-white rounded-2xl border border-gray-100 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-500/5 transition-all duration-300 block overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/0 to-fuchsia-500/0 group-hover:from-violet-500/[0.02] group-hover:to-fuchsia-500/[0.04] transition-all duration-300" />
                      <div className="relative">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center text-lg font-bold text-violet-600 shrink-0">
                              {plugin.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-base font-semibold text-gray-900 truncate group-hover:text-violet-700 transition-colors">
                                {plugin.name}
                              </h3>
                              <p className="text-xs text-gray-400">by {plugin.authorName}</p>
                            </div>
                          </div>
                          <StatusBadge label={`v${plugin.version}`} colorScheme="purple" />
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-2 mb-4 leading-relaxed">
                          {plugin.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Download className="w-3.5 h-3.5" />
                              {plugin.downloadCount}
                            </span>
                          </div>
                          {plugin.tags && plugin.tags.length > 0 && (
                            <div className="flex items-center gap-1">
                              {plugin.tags.slice(0, 2).map(tag => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center px-2 py-0.5 bg-gray-50 text-gray-500 rounded-md text-xs"
                                >
                                  <Tag className="w-2.5 h-2.5 mr-0.5 opacity-50" />
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="mt-10 flex items-center justify-center gap-3">
                    <button
                      onClick={() => fetchPlugins(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      className="p-2.5 rounded-xl bg-white border border-gray-200 hover:border-violet-300 hover:shadow-md disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div className="flex items-center gap-1.5 px-4 py-2 bg-white rounded-xl border border-gray-200">
                      <span className="text-sm text-gray-600">
                        <span className="font-semibold text-gray-900">{pagination.page}</span>
                        <span className="mx-1.5 text-gray-300">/</span>
                        {totalPages}
                      </span>
                    </div>
                    <button
                      onClick={() => fetchPlugins(pagination.page + 1)}
                      disabled={pagination.page >= totalPages}
                      className="p-2.5 rounded-xl bg-white border border-gray-200 hover:border-violet-300 hover:shadow-md disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

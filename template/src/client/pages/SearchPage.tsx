import { useState, useEffect, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Search, Tag, Download, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { usePluginStore } from '@client/stores/pluginStore'
import { LoadingSpinner, EmptyState, StatusBadge } from '@client/components'

export const SearchPage: React.FC = () => {
  const plugins = usePluginStore(state => state.plugins)
  const loading = usePluginStore(state => state.loading)
  const error = usePluginStore(state => state.error)
  const searchQuery = usePluginStore(state => state.searchQuery)
  const categories = usePluginStore(state => state.categories)
  const selectedCategory = usePluginStore(state => state.selectedCategory)
  const pagination = usePluginStore(state => state.pagination)
  const searchPlugins = usePluginStore(state => state.searchPlugins)
  const fetchCategories = usePluginStore(state => state.fetchCategories)
  const setSearchQuery = usePluginStore(state => state.setSearchQuery)
  const setSelectedCategory = usePluginStore(state => state.setSelectedCategory)

  const [inputValue, setInputValue] = useState(searchQuery)

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  useEffect(() => {
    if (searchQuery) {
      searchPlugins(searchQuery, 1)
    }
  }, [selectedCategory]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    if (inputValue.trim()) {
      setSearchQuery(inputValue.trim())
      searchPlugins(inputValue.trim(), 1)
    }
  }

  const totalPages = Math.ceil(pagination.total / pagination.limit)

  return (
    <div className="min-h-screen" data-testid="search-page">
      <Helmet>
        <title>Search Plugins - Plugin Marketplace</title>
        <meta name="description" content="Search for plugins" />
      </Helmet>

      <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pt-12 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl shadow-lg shadow-violet-500/25">
              <Search className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Search Plugins</h1>
          </div>
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder="Search for plugins by name, tag, or keyword..."
                className="w-full pl-12 pr-36 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl focus:ring-2 focus:ring-violet-400 focus:border-transparent outline-none text-white placeholder-purple-200/40 text-base"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || loading}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl hover:from-violet-400 hover:to-fuchsia-400 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed transition-all font-semibold text-sm shadow-md"
              >
                {loading ? <LoadingSpinner size="sm" color="text-white" /> : 'Search'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 -mt-6 pb-16">
        <div className="bg-white rounded-2xl shadow-xl shadow-black/5 border border-gray-100 p-4 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <SlidersHorizontal className="w-4 h-4 text-gray-400 shrink-0" />
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3.5 py-1.5 text-sm rounded-lg transition-all font-medium ${
                !selectedCategory
                  ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.slug)}
                className={`px-3.5 py-1.5 text-sm rounded-lg transition-all font-medium ${
                  selectedCategory === cat.slug
                    ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.icon && <span className="mr-1">{cat.icon}</span>}
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-600 rounded-2xl">
            {error}
          </div>
        )}

        {loading && plugins.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : plugins.length === 0 && searchQuery ? (
          <EmptyState
            icon={Search}
            title={`No results for "${searchQuery}"`}
            description="Try a different search term"
          />
        ) : plugins.length === 0 ? (
          <EmptyState icon={Search} title="Start searching for plugins" />
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">
              Found <span className="font-semibold text-gray-700">{pagination.total}</span> results
            </p>
            <div className="space-y-3">
              {plugins.map(plugin => (
                <Link
                  key={plugin.id}
                  to={`/plugins/${plugin.slug}`}
                  className="group flex items-start gap-4 p-5 bg-white rounded-2xl border border-gray-100 hover:border-violet-200 hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-300"
                >
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center text-lg font-bold text-violet-600 shrink-0">
                    {plugin.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-gray-900 group-hover:text-violet-700 transition-colors">
                        {plugin.name}
                      </h3>
                      <StatusBadge label={`v${plugin.version}`} colorScheme="purple" />
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">by {plugin.authorName}</p>
                    <p className="text-sm text-gray-600 mt-1.5 line-clamp-2 leading-relaxed">
                      {plugin.description}
                    </p>
                    <div className="mt-2.5 flex items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Download className="w-3.5 h-3.5" />
                        {plugin.downloadCount}
                      </span>
                      {plugin.tags &&
                        plugin.tags.slice(0, 3).map(tag => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-0.5 bg-gray-50 text-gray-500 rounded-md"
                          >
                            <Tag className="w-2.5 h-2.5 mr-0.5 opacity-50" />
                            {tag}
                          </span>
                        ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-3">
                <button
                  onClick={() => searchPlugins(searchQuery, pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="p-2.5 rounded-xl bg-white border border-gray-200 hover:border-violet-300 hover:shadow-md disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="px-4 py-2 bg-white rounded-xl border border-gray-200 text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">{pagination.page}</span>
                  <span className="mx-1.5 text-gray-300">/</span>
                  {totalPages}
                </div>
                <button
                  onClick={() => searchPlugins(searchQuery, pagination.page + 1)}
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
  )
}

import { useState, useEffect, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Search, Tag, Download, ChevronLeft, ChevronRight } from 'lucide-react'
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
    <div className="max-w-4xl mx-auto p-6" data-testid="search-page">
      <Helmet>
        <title>Search Plugins - Plugin Marketplace</title>
        <meta name="description" content="Search for plugins" />
      </Helmet>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Search className="w-8 h-8 text-blue-500" />
          Search Plugins
        </h1>
        <p className="text-gray-500 mt-2">Find the perfect plugin for your needs</p>
      </div>

      <form onSubmit={handleSearch} className="mb-6 flex gap-3">
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder="Search plugins..."
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || loading}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {loading ? <LoadingSpinner size="sm" color="text-white" /> : 'Search'}
        </button>
      </form>

      <div className="mb-6 flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-500">Filter:</span>
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            !selectedCategory
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.slug)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              selectedCategory === cat.slug
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {loading && plugins.length === 0 ? (
        <div className="flex items-center justify-center py-12">
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
          <div className="space-y-4">
            {plugins.map(plugin => (
              <Link
                key={plugin.id}
                to={`/plugins/${plugin.slug}`}
                className="p-5 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all block"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900">{plugin.name}</h3>
                    <p className="text-sm text-gray-500">
                      by {plugin.authorName} &middot; v{plugin.version}
                    </p>
                  </div>
                  <StatusBadge label={`v${plugin.version}`} colorScheme="blue" />
                </div>
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{plugin.description}</p>
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Download className="w-3.5 h-3.5" />
                    {plugin.downloadCount}
                  </span>
                  {plugin.tags &&
                    plugin.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded"
                      >
                        <Tag className="w-3 h-3 mr-0.5" />
                        {tag}
                      </span>
                    ))}
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => searchPlugins(searchQuery, pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-600">
                Page {pagination.page} of {totalPages}
              </span>
              <button
                onClick={() => searchPlugins(searchQuery, pagination.page + 1)}
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
  )
}

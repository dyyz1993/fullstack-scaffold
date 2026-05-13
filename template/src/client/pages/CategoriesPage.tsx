import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { FolderOpen } from 'lucide-react'
import { usePluginStore } from '@client/stores/pluginStore'
import { LoadingSpinner, EmptyState } from '@client/components'

export const CategoriesPage: React.FC = () => {
  const categories = usePluginStore(state => state.categories)
  const loading = usePluginStore(state => state.loading)
  const fetchCategories = usePluginStore(state => state.fetchCategories)
  const setSelectedCategory = usePluginStore(state => state.setSelectedCategory)

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  return (
    <div className="max-w-4xl mx-auto p-6" data-testid="categories-page">
      <Helmet>
        <title>Categories - Plugin Marketplace</title>
        <meta name="description" content="Browse plugins by category" />
      </Helmet>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
        <p className="text-gray-500 mt-2">Browse plugins by category</p>
      </div>

      {loading && categories.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : categories.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No categories yet" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map(category => (
            <Link
              key={category.id}
              to="/plugins"
              onClick={() => setSelectedCategory(category.slug)}
              className="p-6 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all block"
            >
              <div className="text-3xl mb-3">{category.icon || '📁'}</div>
              <h3 className="text-lg font-medium text-gray-900">{category.name}</h3>
              {category.description && (
                <p className="text-sm text-gray-500 mt-1">{category.description}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

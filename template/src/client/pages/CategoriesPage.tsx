import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { FolderOpen, Package } from 'lucide-react'
import { usePluginStore } from '@client/stores/pluginStore'
import { LoadingSpinner, EmptyState } from '@client/components'

const categoryGradients = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-500',
  'from-fuchsia-500 to-pink-500',
  'from-emerald-500 to-teal-500',
  'from-orange-500 to-amber-500',
  'from-rose-500 to-red-500',
  'from-indigo-500 to-blue-600',
  'from-teal-500 to-green-500',
  'from-cyan-500 to-sky-500',
]

export const CategoriesPage: React.FC = () => {
  const categories = usePluginStore(state => state.categories)
  const loading = usePluginStore(state => state.loading)
  const fetchCategories = usePluginStore(state => state.fetchCategories)
  const setSelectedCategory = usePluginStore(state => state.setSelectedCategory)

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  return (
    <div className="min-h-screen" data-testid="categories-page">
      <Helmet>
        <title>Categories - Plugin Marketplace</title>
        <meta name="description" content="Browse plugins by category" />
      </Helmet>

      <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pt-12 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl shadow-lg shadow-violet-500/25">
              <FolderOpen className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Categories</h1>
          </div>
          <p className="text-purple-200/70 text-lg">
            Browse plugins by category to find exactly what you need
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-8 pb-16">
        {loading && categories.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : categories.length === 0 ? (
          <EmptyState icon={FolderOpen} title="No categories yet" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {categories.map((category, index) => (
              <Link
                key={category.id}
                to="/plugins"
                onClick={() => setSelectedCategory(category.slug)}
                className="group relative overflow-hidden bg-white rounded-2xl border border-gray-100 hover:border-transparent hover:shadow-2xl hover:shadow-violet-500/10 transition-all duration-300 block"
              >
                <div
                  className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${
                    categoryGradients[index % categoryGradients.length]
                  } opacity-60 group-hover:opacity-100 transition-opacity`}
                />
                <div className="p-6">
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${
                      categoryGradients[index % categoryGradients.length]
                    } flex items-center justify-center text-2xl shadow-lg mb-4`}
                  >
                    {category.icon || '📁'}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-violet-700 transition-colors">
                    {category.name}
                  </h3>
                  {category.description && (
                    <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                      {category.description}
                    </p>
                  )}
                  <div className="mt-4 flex items-center gap-1.5 text-xs text-violet-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    <Package className="w-3.5 h-3.5" />
                    Browse plugins
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

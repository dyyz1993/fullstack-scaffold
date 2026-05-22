// template/src/client/pages/{Name}Page.tsx
import { useEffect } from 'react'
import { use{Name}Store } from '@client/stores/{name}Store'

export const {Name}Page: React.FC = () => {
  const items = use{Name}Store(state => state.items)
  const loading = use{Name}Store(state => state.loading)
  const error = use{Name}Store(state => state.error)
  const fetchItems = use{Name}Store(state => state.fetchItems)
  const deleteItem = use{Name}Store(state => state.deleteItem)

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  if (loading && items.length === 0) {
    return <div className="flex justify-center p-8"><span className="text-gray-500">Loading...</span></div>
  }

  if (error) {
    return <div className="p-4 text-red-600 bg-red-50 rounded-lg">{error}</div>
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{Names}</h1>
        {/* Add create button */}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No {names} yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-medium text-gray-900">#{item.id}</span>
                  {/* Add item fields */}
                </div>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

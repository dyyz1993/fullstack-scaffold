import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Package, Truck, Clock, CheckCircle, XCircle, RotateCcw, Search } from 'lucide-react'

type ECommerceOrderStatus = 'processing' | 'shipped' | 'delivered' | 'cancelled'

interface ECommerceProduct {
  name: string
  color: string
}

interface ECommerceOrder {
  id: string
  date: string
  status: ECommerceOrderStatus
  products: ECommerceProduct[]
  total: number
}

type FilterStatus = 'all' | ECommerceOrderStatus

const MOCK_ORDERS: ECommerceOrder[] = [
  {
    id: 'ORD-2024-001',
    date: '2024-12-10',
    status: 'processing',
    products: [
      { name: 'Wireless Headphones', color: '#374151' },
      { name: 'USB-C Cable', color: '#6366f1' },
    ],
    total: 94.98,
  },
  {
    id: 'ORD-2024-002',
    date: '2024-12-08',
    status: 'shipped',
    products: [
      { name: 'Organic Cotton T-Shirt', color: '#6ee7b7' },
      { name: 'Ceramic Travel Mug', color: '#f59e0b' },
      { name: 'Linen Tote Bag', color: '#d4a574' },
    ],
    total: 79.97,
  },
  {
    id: 'ORD-2024-003',
    date: '2024-12-01',
    status: 'delivered',
    products: [
      { name: 'Bamboo Desk Organizer', color: '#a3e635' },
      { name: 'Recycled Notebook', color: '#f472b6' },
    ],
    total: 45.98,
  },
  {
    id: 'ORD-2024-004',
    date: '2024-11-25',
    status: 'delivered',
    products: [{ name: 'Beeswax Candle Set', color: '#fbbf24' }],
    total: 29.99,
  },
  {
    id: 'ORD-2024-005',
    date: '2024-11-20',
    status: 'cancelled',
    products: [
      { name: 'Wooden Phone Stand', color: '#92400e' },
      { name: 'Plant-Based Soap', color: '#86efac' },
    ],
    total: 39.98,
  },
]

const STATUS_CONFIG: Record<
  ECommerceOrderStatus,
  { label: string; icon: React.FC<{ className?: string }>; bg: string; text: string }
> = {
  processing: { label: 'Processing', icon: Clock, bg: 'bg-amber-100', text: 'text-amber-700' },
  shipped: { label: 'Shipped', icon: Truck, bg: 'bg-blue-100', text: 'text-blue-700' },
  delivered: { label: 'Delivered', icon: CheckCircle, bg: 'bg-green-100', text: 'text-green-700' },
  cancelled: { label: 'Cancelled', icon: XCircle, bg: 'bg-red-100', text: 'text-red-700' },
}

const FILTER_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const OrdersPage: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all')

  const filteredOrders =
    activeFilter === 'all'
      ? MOCK_ORDERS
      : MOCK_ORDERS.filter(order => order.status === activeFilter)

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6" data-testid="orders-page">
      <Helmet>
        <title>Order History - Biomimic App</title>
        <meta name="description" content="View your order history and track shipments" />
      </Helmet>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900" data-testid="orders-title">
          Order History
        </h1>
        <p className="text-gray-500 mt-2">{MOCK_ORDERS.length} orders placed</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6" data-testid="orders-filters">
        {FILTER_OPTIONS.map(option => (
          <button
            key={option.value}
            onClick={() => setActiveFilter(option.value)}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
              activeFilter === option.value
                ? 'bg-amber-500 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
            data-testid={`orders-filter-${option.value}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20" data-testid="orders-empty">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-6">
            <Search className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No orders found</h2>
          <p className="text-gray-500">No orders match the selected filter.</p>
        </div>
      ) : (
        <div className="space-y-4" data-testid="orders-list">
          {filteredOrders.map(order => {
            const statusCfg = STATUS_CONFIG[order.status]
            const StatusIcon = statusCfg.icon
            return (
              <div
                key={order.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"
                data-testid={`order-card-${order.id}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3
                        className="font-semibold text-gray-900"
                        data-testid={`order-id-${order.id}`}
                      >
                        {order.id}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${statusCfg.bg} ${statusCfg.text}`}
                        data-testid={`order-status-${order.id}`}
                      >
                        <StatusIcon className="w-3.5 h-3.5" />
                        {statusCfg.label}
                      </span>
                    </div>
                    <p
                      className="text-sm text-gray-500 mt-0.5"
                      data-testid={`order-date-${order.id}`}
                    >
                      {new Date(order.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <p
                    className="text-lg font-bold text-gray-900"
                    data-testid={`order-total-${order.id}`}
                  >
                    ${order.total.toFixed(2)}
                  </p>
                </div>

                <div
                  className="flex items-center gap-2 mb-4"
                  data-testid={`order-products-${order.id}`}
                >
                  {order.products.map((product, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg"
                      data-testid={`order-product-${order.id}-${idx}`}
                    >
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: product.color }}
                      >
                        <Package className="w-3 h-3 text-white/70" />
                      </div>
                      <span className="text-sm text-gray-700 truncate max-w-[120px] sm:max-w-[200px]">
                        {product.name}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                  {(order.status === 'shipped' || order.status === 'processing') && (
                    <button
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-amber-600 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors"
                      data-testid={`order-track-${order.id}`}
                    >
                      <Truck className="w-4 h-4" />
                      Track Order
                    </button>
                  )}
                  <button
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                    data-testid={`order-reorder-${order.id}`}
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reorder
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

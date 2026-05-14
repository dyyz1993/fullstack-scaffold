import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Package, Minus, Plus, Trash2, ShoppingBag, ArrowLeft } from 'lucide-react'

interface CartItem {
  id: number
  name: string
  variant: string
  price: number
  quantity: number
  color: string
}

const INITIAL_CART: CartItem[] = [
  {
    id: 1,
    name: 'Wireless Headphones',
    variant: 'Black',
    price: 79.99,
    quantity: 1,
    color: '#374151',
  },
  {
    id: 2,
    name: 'Organic Cotton T-Shirt',
    variant: 'Medium / Sage',
    price: 34.99,
    quantity: 2,
    color: '#6ee7b7',
  },
  {
    id: 3,
    name: 'Ceramic Travel Mug',
    variant: 'Amber / 350ml',
    price: 24.99,
    quantity: 1,
    color: '#f59e0b',
  },
]

const SHIPPING_THRESHOLD = 50
const TAX_RATE = 0.08

export const CartPage: React.FC = () => {
  const [items, setItems] = useState<CartItem[]>(INITIAL_CART)

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : 5.99
  const tax = subtotal * TAX_RATE
  const total = subtotal + shipping + tax
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)

  const updateQuantity = (id: number, delta: number) => {
    setItems(prev =>
      prev
        .map(item =>
          item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        )
        .filter(item => item.quantity > 0)
    )
  }

  const removeItem = (id: number) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6" data-testid="cart-page">
      <Helmet>
        <title>Shopping Cart - Biomimic App</title>
        <meta name="description" content="Review your shopping cart" />
      </Helmet>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900" data-testid="cart-title">
          Shopping Cart
          {totalItems > 0 && (
            <span className="text-lg font-normal text-gray-500 ml-2">
              ({totalItems} item{totalItems !== 1 ? 's' : ''})
            </span>
          )}
        </h1>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20" data-testid="cart-empty">
          <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mb-6">
            <ShoppingBag className="w-10 h-10 text-amber-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-500 mb-6">Looks like you haven&apos;t added anything yet.</p>
          <button
            className="px-6 py-3 bg-amber-500 text-white font-medium rounded-xl hover:bg-amber-600 transition-colors"
            data-testid="cart-browse-button"
          >
            Browse Products
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4" data-testid="cart-items">
            {items.map(item => (
              <div
                key={item.id}
                className="flex gap-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm"
                data-testid={`cart-item-${item.id}`}
              >
                <div
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                  data-testid={`cart-item-image-${item.id}`}
                >
                  <Package className="w-8 h-8 text-white/70" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3
                        className="font-medium text-gray-900 truncate"
                        data-testid={`cart-item-name-${item.id}`}
                      >
                        {item.name}
                      </h3>
                      <p
                        className="text-sm text-gray-500"
                        data-testid={`cart-item-variant-${item.id}`}
                      >
                        {item.variant}
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                      data-testid={`cart-item-remove-${item.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div
                      className="flex items-center gap-2"
                      data-testid={`cart-item-qty-${item.id}`}
                    >
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
                        data-testid={`cart-item-decrease-${item.id}`}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span
                        className="w-8 text-center text-sm font-medium text-gray-900"
                        data-testid={`cart-item-count-${item.id}`}
                      >
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
                        data-testid={`cart-item-increase-${item.id}`}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-right">
                      <p
                        className="text-sm text-gray-500"
                        data-testid={`cart-item-unit-price-${item.id}`}
                      >
                        ${item.price.toFixed(2)} each
                      </p>
                      <p
                        className="font-semibold text-gray-900"
                        data-testid={`cart-item-total-${item.id}`}
                      >
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-1" data-testid="cart-summary">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="text-gray-900 font-medium" data-testid="cart-subtotal">
                    ${subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Shipping</span>
                  <span className="text-gray-900 font-medium" data-testid="cart-shipping">
                    {shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tax</span>
                  <span className="text-gray-900 font-medium" data-testid="cart-tax">
                    ${tax.toFixed(2)}
                  </span>
                </div>

                <div className="border-t border-gray-200 pt-3 mt-3">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="font-bold text-gray-900 text-lg" data-testid="cart-total">
                      ${total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                className="w-full mt-6 px-6 py-3 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 transition-colors"
                data-testid="cart-checkout-button"
              >
                Checkout
              </button>

              <div className="mt-4 text-center">
                <button
                  className="inline-flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700 font-medium transition-colors"
                  data-testid="cart-continue-shopping"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Continue Shopping
                </button>
              </div>

              {subtotal < SHIPPING_THRESHOLD && subtotal > 0 && (
                <p
                  className="mt-4 text-xs text-gray-500 text-center"
                  data-testid="cart-shipping-note"
                >
                  Add ${(SHIPPING_THRESHOLD - subtotal).toFixed(2)} more for free shipping
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

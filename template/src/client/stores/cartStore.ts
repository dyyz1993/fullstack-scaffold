import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * 购物车本地 store（ecommerce preset）。
 * 后端 /api/cart 为演示 mock，无法承载真实加购——闭环在客户端完成：
 * 详情页加购 → 购物车增删改（persist 到 localStorage）→ 结算清空。
 */
import type { CartItem } from '@shared/schemas'

interface CartState {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void
  updateQuantity: (id: number, delta: number) => void
  removeItem: (id: number) => void
  clearCart: () => void
}

export const useCartStore = create<CartState>()(
  persist(
    set => ({
      items: [],

      addItem: (item, quantity = 1) =>
        set(state => {
          const existing = state.items.find(i => i.id === item.id)
          if (existing) {
            return {
              items: state.items.map(i =>
                i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i
              ),
            }
          }
          return { items: [...state.items, { ...item, quantity }] }
        }),

      updateQuantity: (id, delta) =>
        set(state => ({
          items: state.items
            .map(i => (i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i))
            .filter(i => i.quantity > 0),
        })),

      removeItem: id => set(state => ({ items: state.items.filter(i => i.id !== id) })),

      clearCart: () => set({ items: [] }),
    }),
    { name: 'shop-cart' }
  )
)

/** 内容 id → 稳定演示价（无商品表时的确定性定价，同一内容每次价格一致） */
export function demoPriceFor(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return Math.round((19.99 + (hash % 7000) / 100) * 100) / 100
}

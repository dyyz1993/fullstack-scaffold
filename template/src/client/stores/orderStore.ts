import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ECommerceOrder } from '@shared/schemas'
import type { CartItem } from '@shared/schemas'

/**
 * 订单本地 store（ecommerce preset）：checkout 时把购物车转成订单，
 * persist 到 localStorage——与 cartStore 同为本 demo 的客户端闭环，
 * shop 形态无 auth 模块，无服务端身份可归属。
 */
interface OrderState {
  orders: ECommerceOrder[]
  placeOrder: (items: CartItem[], total: number) => ECommerceOrder
}

let seq = 0

export const useOrderStore = create<OrderState>()(
  persist(
    set => ({
      orders: [],

      placeOrder: (items, total) => {
        seq += 1
        const order: ECommerceOrder = {
          id: `ORD-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}${seq}`,
          date: new Date().toISOString().slice(0, 10),
          status: 'processing',
          products: items.map(i => ({ name: i.name, color: i.color })),
          total,
        }
        set(state => ({ orders: [order, ...state.orders] }))
        return order
      },
    }),
    { name: 'shop-orders' }
  )
)

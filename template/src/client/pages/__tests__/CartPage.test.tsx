import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { MemoryRouter } from 'react-router-dom'
import { CartPage } from '../CartPage'
import { useCartStore } from '@client/stores/cartStore'
import { useOrderStore } from '@client/stores/orderStore'
import type { CartItem } from '@shared/schemas'

// 部分测试环境无 Storage 实现（localStorage.setItem 缺失），
// zustand persist 在 store 模块导入时即解析 storage——必须在 import 前
// （vi.hoisted）注入一个最小内存 Storage
vi.hoisted(() => {
  const map = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => {
        map.set(key, value)
      },
      removeItem: (key: string) => {
        map.delete(key)
      },
      clear: () => {
        map.clear()
      },
    },
  })
})

const mockItems: CartItem[] = [
  { id: 1, name: 'Lotus Panel', variant: 'Large', color: '#c7d2fe', price: 30, quantity: 1 },
]

function renderCart() {
  return render(
    <MemoryRouter>
      <CartPage />
    </MemoryRouter>
  )
}

describe('CartPage checkout 防重', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [...mockItems] })
    useOrderStore.setState({ orders: [] })
  })

  it('双击 Checkout 只产生一笔订单（同帧共享闭包也不重复）', () => {
    renderCart()

    const button = screen.getByTestId('cart-checkout-button')
    // fireEvent 双击：第二次 click 与第一次共享同一渲染闭包，
    // 复现实测 P2（历史缺陷：生成 2 笔 ORD-2026）
    fireEvent.click(button)
    fireEvent.click(button)

    const { orders } = useOrderStore.getState()
    expect(orders).toHaveLength(1)
    expect(orders[0].id).toMatch(/^ORD-\d{4}/)
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('dblClick 事件同样只产生一笔订单', async () => {
    // userEvent.dblClick 会触发 click→click→dblclick 完整事件序列
    //（fireEvent.dblClick 只派发 dblclick，React onClick 不响应）
    const user = userEvent.setup()
    renderCart()

    await user.dblClick(screen.getByTestId('cart-checkout-button'))

    expect(useOrderStore.getState().orders).toHaveLength(1)
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('提交后清空购物车，Checkout 按钮卸载，无法再次提交', () => {
    // 结算即清空购物车：整棵结算树被空车分支替换，按钮随之卸载，
    // 这是比 disabled 更强的防重保证（连按钮都不存在）
    renderCart()

    fireEvent.click(screen.getByTestId('cart-checkout-button'))

    expect(useOrderStore.getState().orders).toHaveLength(1)
    expect(screen.queryByTestId('cart-checkout-button')).not.toBeInTheDocument()
    expect(screen.getByTestId('cart-empty')).toBeInTheDocument()
    expect(screen.getByTestId('cart-order-done')).toBeInTheDocument()
  })

  it('空购物车不渲染 Checkout 按钮，无法产生订单', () => {
    useCartStore.setState({ items: [] })
    renderCart()

    // 空车分支根本没有结算按钮，UI 层面杜绝点击下单
    expect(screen.queryByTestId('cart-checkout-button')).not.toBeInTheDocument()
    expect(screen.getByTestId('cart-empty')).toBeInTheDocument()
    expect(useOrderStore.getState().orders).toHaveLength(0)
  })
})

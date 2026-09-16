import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MemoryRouter } from 'react-router-dom'
import { Sidebar } from '../Sidebar'

// mock 可用路由表：模拟不同 preset 生成的 sidebar-availability.ts 内容
const mockState = vi.hoisted(() => ({
  routes: [] as string[],
}))

vi.mock('../sidebar-availability', () => ({
  // getter 保证读取的是最新 mockState.routes（避免测试间重赋值丢失引用）
  get AVAILABLE_ADMIN_ROUTES() {
    return mockState.routes
  },
}))

const FULLSTACK_ADMIN_ROUTES = [
  '/login',
  '/register',
  '/dashboard',
  '/users',
  '/system/settings',
  '/test/media',
  '/content',
  '/orders',
  '/tickets',
  '/disputes',
  '/system/permissions',
  '/system/roles',
  '/system/logs',
  '/plugins',
  '/plugins/review',
  '/plugins/dashboard',
  '/categories',
]

// forum preset：content + auth + permission + admin + notifications，无 plugin 模块
const FORUM_ROUTES = [
  '/login',
  '/register',
  '/dashboard',
  '/users',
  '/system/settings',
  '/test/media',
  '/content',
  '/system/permissions',
  '/system/roles',
  '/system/logs',
]

const renderSidebar = (path = '/dashboard') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Sidebar collapsed={false} onCollapse={() => {}} />
    </MemoryRouter>
  )

describe('Sidebar preset route filtering (P2: forum /admin/categories 空白壳回归)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows all plugin entries for fullstack-admin routes', () => {
    mockState.routes = FULLSTACK_ADMIN_ROUTES
    renderSidebar()

    // 可用入口与分组全部渲染
    expect(screen.getByText('内容管理')).toBeInTheDocument()
    expect(screen.getByText('插件管理')).toBeInTheDocument() // 分组标题
    expect(screen.getByText('插件列表')).toBeInTheDocument()
    expect(screen.getByText('插件审核')).toBeInTheDocument()
    expect(screen.getByText('分类管理')).toBeInTheDocument()
    expect(screen.getByText('用户与订单')).toBeInTheDocument()
    expect(screen.getByText('订单管理')).toBeInTheDocument()
  })

  it('hides plugin entries (incl. categories) when preset lacks plugin module', () => {
    mockState.routes = FORUM_ROUTES
    renderSidebar()

    // forum 可用入口仍在（admin 模块自带 /users，content 模块自带 /content）
    expect(screen.getByText('内容管理')).toBeInTheDocument()
    expect(screen.getByText('用户与订单')).toBeInTheDocument()
    expect(screen.getByText('用户管理')).toBeInTheDocument()

    // plugin 模块入口全部隐藏（分类管理即 /categories 入口），分组标题一并消失
    expect(screen.queryByText('插件管理')).not.toBeInTheDocument()
    expect(screen.queryByText('插件列表')).not.toBeInTheDocument()
    expect(screen.queryByText('插件审核')).not.toBeInTheDocument()
    expect(screen.queryByText('分类管理')).not.toBeInTheDocument()

    // forum 同样没有 order/ticket/dispute 模块，对应入口一并隐藏
    expect(screen.queryByText('订单管理')).not.toBeInTheDocument()
    expect(screen.queryByText('工单管理')).not.toBeInTheDocument()
    expect(screen.queryByText('纠纷管理')).not.toBeInTheDocument()
  })
})

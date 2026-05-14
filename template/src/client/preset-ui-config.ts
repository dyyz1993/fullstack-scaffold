import { lazy, type ComponentType } from 'react'
import type { PresetType } from './Layout'

export type { PresetType } from './Layout'

// ClientNavItem is intentionally simpler than admin MenuItem (no permissions/children needed for client nav)
// eslint-disable-next-line local-rules/prefer-shared-types
export interface ClientNavItem {
  label: string
  icon: string
  path: string
}

export type TabItem = ClientNavItem

export interface PresetTheme {
  primaryColor: string
  primaryHover: string
  bgColor: string
  textColor: string
  secondaryBg: string
  borderColor: string
  borderRadius: string
  logoText: string
  fontFamily: string
}

export interface RouteDef {
  path: string
  component: ComponentType<Record<string, unknown>> | null
  label: string
}

export interface PresetUIConfig {
  id: PresetType
  name: string
  theme: PresetTheme
  desktopNav: ClientNavItem[]
  mobileTabs: ClientNavItem[]
  routes: RouteDef[]
  defaultRoute: string
}

const TODO_THEME: PresetTheme = {
  primaryColor: '#6366f1',
  primaryHover: '#4f46e5',
  bgColor: '#ffffff',
  textColor: '#111827',
  secondaryBg: '#f9fafb',
  borderColor: '#e5e7eb',
  borderRadius: '12px',
  logoText: 'Biomimic',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
}

const PLUGIN_MARKET_THEME: PresetTheme = {
  primaryColor: '#3b82f6',
  primaryHover: '#2563eb',
  bgColor: '#ffffff',
  textColor: '#111827',
  secondaryBg: '#f0f9ff',
  borderColor: '#bae6fd',
  borderRadius: '12px',
  logoText: 'PluginHub',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
}

const ECOMMERCE_THEME: PresetTheme = {
  primaryColor: '#f59e0b',
  primaryHover: '#d97706',
  bgColor: '#ffffff',
  textColor: '#111827',
  secondaryBg: '#fffbeb',
  borderColor: '#fde68a',
  borderRadius: '12px',
  logoText: 'ShopMart',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
}

const COMMUNITY_THEME: PresetTheme = {
  primaryColor: '#10b981',
  primaryHover: '#059669',
  bgColor: '#ffffff',
  textColor: '#111827',
  secondaryBg: '#ecfdf5',
  borderColor: '#a7f3d0',
  borderRadius: '12px',
  logoText: 'Community',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
}

const SAAS_ADMIN_THEME: PresetTheme = {
  primaryColor: '#1f2937',
  primaryHover: '#374151',
  bgColor: '#f9fafb',
  textColor: '#111827',
  secondaryBg: '#f3f4f6',
  borderColor: '#e5e7eb',
  borderRadius: '8px',
  logoText: 'AdminPanel',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
}

export const PRESET_UI_CONFIGS: Record<PresetType, PresetUIConfig> = {
  todo: {
    id: 'todo',
    name: 'Todo App',
    theme: TODO_THEME,
    desktopNav: [
      { label: 'Today', icon: 'Sun', path: '/todos' },
      { label: 'Calendar', icon: 'Calendar', path: '/todos/calendar' },
      { label: 'Projects', icon: 'FolderKanban', path: '/todos/projects' },
    ],
    mobileTabs: [
      { label: 'Today', icon: 'Sun', path: '/todos' },
      { label: 'Calendar', icon: 'Calendar', path: '/todos/calendar' },
      { label: 'Projects', icon: 'FolderKanban', path: '/todos/projects' },
    ],
    defaultRoute: '/todos',
    routes: [
      {
        path: '/login',
        component: lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage }))),
        label: 'Login',
      },
      {
        path: '/register',
        component: lazy(() =>
          import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage }))
        ),
        label: 'Register',
      },
      {
        path: '/todos',
        component: lazy(() => import('./pages/TodoPage').then(m => ({ default: m.TodoPage }))),
        label: 'Todos',
      },
      {
        path: '/notifications',
        component: lazy(() =>
          import('./pages/NotificationPage').then(m => ({ default: m.NotificationPage }))
        ),
        label: 'Notifications',
      },
      {
        path: '/websocket',
        component: lazy(() =>
          import('./pages/WebSocketPage').then(m => ({ default: m.WebSocketPage }))
        ),
        label: 'WebSocket',
      },
    ],
  },

  plugin: {
    id: 'plugin',
    name: 'Plugin Market',
    theme: PLUGIN_MARKET_THEME,
    desktopNav: [
      { label: 'Discover', icon: 'Compass', path: '/plugins' },
      { label: 'Plugins', icon: 'Puzzle', path: '/plugins/list' },
      { label: 'Categories', icon: 'Tags', path: '/categories' },
      { label: 'Search', icon: 'Search', path: '/search' },
      { label: 'Publish', icon: 'PlusCircle', path: '/publish' },
      { label: 'Developer', icon: 'Code', path: '/developer' },
    ],
    mobileTabs: [
      { label: 'Discover', icon: 'Compass', path: '/plugins' },
      { label: 'Plugins', icon: 'Puzzle', path: '/plugins/list' },
      { label: 'Categories', icon: 'Tags', path: '/categories' },
      { label: 'Search', icon: 'Search', path: '/search' },
      { label: 'My', icon: 'User', path: '/developer' },
    ],
    defaultRoute: '/plugins',
    routes: [
      {
        path: '/',
        component: lazy(() =>
          import('./pages/PluginsPage').then(m => ({ default: m.PluginsPage }))
        ),
        label: 'Home',
      },
      {
        path: '/login',
        component: lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage }))),
        label: 'Login',
      },
      {
        path: '/register',
        component: lazy(() =>
          import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage }))
        ),
        label: 'Register',
      },
      {
        path: '/plugins',
        component: lazy(() =>
          import('./pages/PluginsPage').then(m => ({ default: m.PluginsPage }))
        ),
        label: 'Plugins',
      },
      {
        path: '/plugins/:slug',
        component: lazy(() =>
          import('./pages/PluginDetailPage').then(m => ({ default: m.PluginDetailPage }))
        ),
        label: 'Plugin Detail',
      },
      {
        path: '/categories',
        component: lazy(() =>
          import('./pages/CategoriesPage').then(m => ({ default: m.CategoriesPage }))
        ),
        label: 'Categories',
      },
      {
        path: '/search',
        component: lazy(() => import('./pages/SearchPage').then(m => ({ default: m.SearchPage }))),
        label: 'Search',
      },
      {
        path: '/publish',
        component: lazy(() =>
          import('./pages/PublishPage').then(m => ({ default: m.PublishPage }))
        ),
        label: 'Publish',
      },
      {
        path: '/developer',
        component: lazy(() =>
          import('./pages/DeveloperDashboardPage').then(m => ({
            default: m.DeveloperDashboardPage,
          }))
        ),
        label: 'Developer',
      },
      {
        path: '/notifications',
        component: lazy(() =>
          import('./pages/NotificationPage').then(m => ({ default: m.NotificationPage }))
        ),
        label: 'Notifications',
      },
    ],
  },

  ecommerce: {
    id: 'ecommerce',
    name: 'E-Commerce',
    theme: ECOMMERCE_THEME,
    desktopNav: [
      { label: 'Home', icon: 'Home', path: '/' },
      { label: 'Products', icon: 'ShoppingBag', path: '/products' },
      { label: 'Cart', icon: 'ShoppingCart', path: '/cart' },
      { label: 'Orders', icon: 'Package', path: '/orders' },
      { label: 'Account', icon: 'User', path: '/content' },
    ],
    mobileTabs: [
      { label: 'Home', icon: 'Home', path: '/' },
      { label: 'Products', icon: 'ShoppingBag', path: '/products' },
      { label: 'Cart', icon: 'ShoppingCart', path: '/cart' },
      { label: 'Orders', icon: 'Package', path: '/orders' },
      { label: 'Me', icon: 'User', path: '/content' },
    ],
    defaultRoute: '/',
    routes: [
      {
        path: '/',
        component: lazy(() =>
          import('./pages/ContentListPage').then(m => ({ default: m.ContentListPage }))
        ),
        label: 'Home',
      },
      {
        path: '/products',
        component: lazy(() =>
          import('./pages/ContentListPage').then(m => ({ default: m.ContentListPage }))
        ),
        label: 'Products',
      },
      {
        path: '/products/:id',
        component: lazy(() =>
          import('./pages/ContentDetailPage').then(m => ({ default: m.ContentDetailPage }))
        ),
        label: 'Product Detail',
      },
      {
        path: '/cart',
        component: lazy(() => import('./pages/CartPage').then(m => ({ default: m.CartPage }))),
        label: 'Cart',
      },
      {
        path: '/orders',
        component: lazy(() => import('./pages/OrdersPage').then(m => ({ default: m.OrdersPage }))),
        label: 'Orders',
      },
      {
        path: '/content',
        component: lazy(() =>
          import('./pages/ContentListPage').then(m => ({ default: m.ContentListPage }))
        ),
        label: 'Content',
      },
      {
        path: '/content/:id',
        component: lazy(() =>
          import('./pages/ContentDetailPage').then(m => ({ default: m.ContentDetailPage }))
        ),
        label: 'Content Detail',
      },
      {
        path: '/login',
        component: lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage }))),
        label: 'Login',
      },
      {
        path: '/register',
        component: lazy(() =>
          import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage }))
        ),
        label: 'Register',
      },
    ],
  },

  community: {
    id: 'community',
    name: 'Community',
    theme: COMMUNITY_THEME,
    desktopNav: [
      { label: 'Topics', icon: 'Hash', path: '/topics' },
      { label: 'Popular', icon: 'TrendingUp', path: '/popular' },
      { label: 'Notifications', icon: 'Bell', path: '/notifications' },
      { label: 'Profile', icon: 'User', path: '/profile' },
    ],
    mobileTabs: [
      { label: 'Topics', icon: 'Hash', path: '/topics' },
      { label: 'Popular', icon: 'TrendingUp', path: '/popular' },
      { label: 'Notifications', icon: 'Bell', path: '/notifications' },
      { label: 'Me', icon: 'User', path: '/profile' },
    ],
    defaultRoute: '/topics',
    routes: [
      {
        path: '/topics',
        component: lazy(() => import('./pages/TopicsPage').then(m => ({ default: m.TopicsPage }))),
        label: 'Topics',
      },
      {
        path: '/popular',
        component: lazy(() => import('./pages/TopicsPage').then(m => ({ default: m.TopicsPage }))),
        label: 'Popular',
      },
      {
        path: '/notifications',
        component: lazy(() =>
          import('./pages/NotificationPage').then(m => ({ default: m.NotificationPage }))
        ),
        label: 'Notifications',
      },
      {
        path: '/profile',
        component: lazy(() =>
          import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage }))
        ),
        label: 'Profile',
      },
      {
        path: '/login',
        component: lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage }))),
        label: 'Login',
      },
      {
        path: '/register',
        component: lazy(() =>
          import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage }))
        ),
        label: 'Register',
      },
    ],
  },

  saas: {
    id: 'saas',
    name: 'SaaS Admin',
    theme: SAAS_ADMIN_THEME,
    desktopNav: [
      { label: 'Dashboard', icon: 'LayoutDashboard', path: '/dashboard' },
      { label: 'Settings', icon: 'Settings', path: '/settings' },
    ],
    mobileTabs: [
      { label: 'Dashboard', icon: 'LayoutDashboard', path: '/dashboard' },
      { label: 'Settings', icon: 'Settings', path: '/settings' },
    ],
    defaultRoute: '/dashboard',
    routes: [
      {
        path: '/dashboard',
        component: lazy(() =>
          import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage }))
        ),
        label: 'Dashboard',
      },
      {
        path: '/settings',
        component: lazy(() =>
          import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage }))
        ),
        label: 'Settings',
      },
      {
        path: '/login',
        component: lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage }))),
        label: 'Login',
      },
    ],
  },
}

export function getPresetUIConfig(id: PresetType): PresetUIConfig {
  return PRESET_UI_CONFIGS[id]
}

export function getPresetUIConfigs(): Record<PresetType, PresetUIConfig> {
  return PRESET_UI_CONFIGS
}

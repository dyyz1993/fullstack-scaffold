import type { ResolvedPreset } from './template-generator'

function getPresetType(presetId: string): string {
  const map: Record<string, string> = {
    'todo-app': 'todo',
    'xbrowser-marketplace': 'plugin',
    ecommerce: 'ecommerce',
    'fullstack-admin': 'saas',
    forum: 'community',
    minimal: 'todo',
  }
  return map[presetId] || 'todo'
}

function getThemeForPresetType(presetType: string): { constName: string; theme: string } {
  const themes: Record<string, { constName: string; theme: string }> = {
    todo: {
      constName: 'TODO_THEME',
      theme: `{
  primaryColor: '#6366f1',
  primaryHover: '#4f46e5',
  bgColor: '#ffffff',
  textColor: '#111827',
  secondaryBg: '#f9fafb',
  borderColor: '#e5e7eb',
  borderRadius: '12px',
  logoText: 'Biomimic',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
}`,
    },
    plugin: {
      constName: 'PLUGIN_MARKET_THEME',
      theme: `{
  primaryColor: '#3b82f6',
  primaryHover: '#2563eb',
  bgColor: '#ffffff',
  textColor: '#111827',
  secondaryBg: '#f0f9ff',
  borderColor: '#bae6fd',
  borderRadius: '12px',
  logoText: 'PluginHub',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
}`,
    },
    ecommerce: {
      constName: 'ECOMMERCE_THEME',
      theme: `{
  primaryColor: '#f59e0b',
  primaryHover: '#d97706',
  bgColor: '#ffffff',
  textColor: '#111827',
  secondaryBg: '#fffbeb',
  borderColor: '#fde68a',
  borderRadius: '12px',
  logoText: 'ShopMart',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
}`,
    },
    saas: {
      constName: 'SAAS_ADMIN_THEME',
      theme: `{
  primaryColor: '#1f2937',
  primaryHover: '#374151',
  bgColor: '#f9fafb',
  textColor: '#111827',
  secondaryBg: '#f3f4f6',
  borderColor: '#e5e7eb',
  borderRadius: '8px',
  logoText: 'AdminPanel',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
}`,
    },
    community: {
      constName: 'COMMUNITY_THEME',
      theme: `{
  primaryColor: '#f97316',
  primaryHover: '#ea580c',
  bgColor: '#ffffff',
  textColor: '#111827',
  secondaryBg: '#fff7ed',
  borderColor: '#fed7aa',
  borderRadius: '12px',
  logoText: 'CommunityHub',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
}`,
    },
  }
  return themes[presetType] || themes.todo
}

interface LazyRoute {
  path: string
  importPath: string
  componentName: string
  label: string
}

function getRoutesForPreset(presetType: string, resolved: ResolvedPreset): LazyRoute[] {
  const hasModule = (m: string) => resolved.modules.has(m)

  const loginRoute = {
    path: '/login',
    importPath: './pages/LoginPage',
    componentName: 'LoginPage',
    label: 'Login',
  }
  const registerRoute = {
    path: '/register',
    importPath: './pages/RegisterPage',
    componentName: 'RegisterPage',
    label: 'Register',
  }
  const maybeAuthRoutes = hasModule('auth')
    ? [
        loginRoute,
        registerRoute,
        {
          path: '/profile',
          importPath: './pages/ProfilePage',
          componentName: 'ProfilePage',
          label: 'Profile',
        },
      ]
    : []

  switch (presetType) {
    case 'todo': {
      const routes: LazyRoute[] = [
        ...maybeAuthRoutes,
        {
          path: '/todos',
          importPath: './pages/TodoPage',
          componentName: 'TodoPage',
          label: 'Todos',
        },
      ]
      if (hasModule('notifications')) {
        routes.push({
          path: '/notifications',
          importPath: './pages/NotificationPage',
          componentName: 'NotificationPage',
          label: 'Notifications',
        })
      }
      if (hasModule('chat')) {
        routes.push({
          path: '/websocket',
          importPath: './pages/WebSocketPage',
          componentName: 'WebSocketPage',
          label: 'WebSocket',
        })
      }
      return routes
    }

    case 'plugin': {
      const routes: LazyRoute[] = []
      if (hasModule('plugin')) {
        routes.push(
          {
            path: '/',
            importPath: './pages/PluginsPage',
            componentName: 'PluginsPage',
            label: 'Home',
          },
          {
            path: '/plugins',
            importPath: './pages/PluginsPage',
            componentName: 'PluginsPage',
            label: 'Plugins',
          },
          {
            path: '/plugins/:slug',
            importPath: './pages/PluginDetailPage',
            componentName: 'PluginDetailPage',
            label: 'Plugin Detail',
          },
          {
            path: '/categories',
            importPath: './pages/CategoriesPage',
            componentName: 'CategoriesPage',
            label: 'Categories',
          },
          {
            path: '/search',
            importPath: './pages/SearchPage',
            componentName: 'SearchPage',
            label: 'Search',
          },
          {
            path: '/publish',
            importPath: './pages/PublishPage',
            componentName: 'PublishPage',
            label: 'Publish',
          },
          {
            path: '/developer',
            importPath: './pages/DeveloperDashboardPage',
            componentName: 'DeveloperDashboardPage',
            label: 'Developer',
          }
        )
      }
      routes.push(...maybeAuthRoutes)
      if (hasModule('notifications')) {
        routes.push({
          path: '/notifications',
          importPath: './pages/NotificationPage',
          componentName: 'NotificationPage',
          label: 'Notifications',
        })
      }
      return routes
    }

    case 'ecommerce': {
      const routes: LazyRoute[] = []
      if (hasModule('content')) {
        routes.push(
          {
            path: '/',
            importPath: './pages/ContentListPage',
            componentName: 'ContentListPage',
            label: 'Home',
          },
          {
            path: '/products',
            importPath: './pages/ContentListPage',
            componentName: 'ContentListPage',
            label: 'Products',
          },
          {
            path: '/products/:id',
            importPath: './pages/ContentDetailPage',
            componentName: 'ContentDetailPage',
            label: 'Product Detail',
          },
          {
            path: '/content',
            importPath: './pages/ContentListPage',
            componentName: 'ContentListPage',
            label: 'Content',
          },
          {
            path: '/content/:id',
            importPath: './pages/ContentDetailPage',
            componentName: 'ContentDetailPage',
            label: 'Content Detail',
          }
        )
      }
      if (hasModule('order')) {
        routes.push(
          {
            path: '/cart',
            importPath: './pages/CartPage',
            componentName: 'CartPage',
            label: 'Cart',
          },
          {
            path: '/orders',
            importPath: './pages/OrdersPage',
            componentName: 'OrdersPage',
            label: 'Orders',
          }
        )
      }
      routes.push(...maybeAuthRoutes)
      return routes
    }

    case 'saas': {
      const routes: LazyRoute[] = []
      if (hasModule('admin')) {
        routes.push(
          {
            path: '/dashboard',
            importPath: './pages/DashboardPage',
            componentName: 'DashboardPage',
            label: 'Dashboard',
          },
          {
            path: '/settings',
            importPath: './pages/SettingsPage',
            componentName: 'SettingsPage',
            label: 'Settings',
          }
        )
      }
      routes.push(...maybeAuthRoutes)
      return routes
    }

    case 'community': {
      const routes: LazyRoute[] = []
      if (hasModule('content')) {
        routes.push(
          {
            path: '/',
            importPath: './pages/ContentListPage',
            componentName: 'ContentListPage',
            label: 'Home',
          },
          {
            path: '/topics',
            importPath: './pages/ContentListPage',
            componentName: 'ContentListPage',
            label: 'Topics',
          },
          {
            path: '/topics/:id',
            importPath: './pages/ContentDetailPage',
            componentName: 'ContentDetailPage',
            label: 'Topic Detail',
          },
          {
            path: '/popular',
            importPath: './pages/ContentListPage',
            componentName: 'ContentListPage',
            label: 'Popular',
          },
          {
            path: '/content',
            importPath: './pages/ContentListPage',
            componentName: 'ContentListPage',
            label: 'Content',
          },
          {
            path: '/content/:id',
            importPath: './pages/ContentDetailPage',
            componentName: 'ContentDetailPage',
            label: 'Content Detail',
          }
        )
      }
      if (hasModule('chat')) {
        routes.push({
          path: '/websocket',
          importPath: './pages/WebSocketPage',
          componentName: 'WebSocketPage',
          label: 'WebSocket',
        })
      }
      if (hasModule('notifications')) {
        routes.push({
          path: '/notifications',
          importPath: './pages/NotificationPage',
          componentName: 'NotificationPage',
          label: 'Notifications',
        })
      }
      routes.push(...maybeAuthRoutes)
      return routes
    }

    default:
      return [...maybeAuthRoutes]
  }
}

function getNavConfigForPreset(
  presetType: string,
  hasAuth: boolean
): {
  desktopNav: string[]
  mobileTabs: string[]
  defaultRoute: string
  name: string
  appType: string
  layout: string
  navigationObj: string
} {
  switch (presetType) {
    case 'todo':
      return {
        name: 'Todo App',
        appType: 'client',
        layout: 'top-nav',
        navigationObj: hasAuth
          ? "{ visible: true, showLogo: true, showSearch: false, showCart: false, authStyle: 'buttons', navItems: 'desktop' }"
          : "{ visible: true, showLogo: true, showSearch: false, showCart: false, authStyle: 'none', navItems: 'desktop' }",
        desktopNav: [
          "{ label: 'Todos', icon: 'CheckSquare', path: '/todos' }",
          "{ label: 'SSE Demo', icon: 'Bell', path: '/notifications' }",
          "{ label: 'WebSocket', icon: 'Zap', path: '/websocket' }",
        ],
        mobileTabs: [
          "{ label: 'Todos', icon: 'CheckSquare', path: '/todos' }",
          "{ label: 'SSE', icon: 'Bell', path: '/notifications' }",
          "{ label: 'WS', icon: 'Zap', path: '/websocket' }",
        ],
        defaultRoute: '/todos',
      }

    case 'plugin':
      return {
        name: 'Plugin Market',
        appType: 'client',
        layout: 'top-nav',
        navigationObj:
          "{ visible: true, showLogo: true, showSearch: true, showCart: false, authStyle: 'text-link', navItems: 'desktop' }",
        desktopNav: [
          "{ label: 'Discover', icon: 'Compass', path: '/plugins' }",
          "{ label: 'Plugins', icon: 'Puzzle', path: '/plugins/list' }",
          "{ label: 'Categories', icon: 'Tags', path: '/categories' }",
          "{ label: 'Search', icon: 'Search', path: '/search' }",
          "{ label: 'Publish', icon: 'PlusCircle', path: '/publish' }",
          "{ label: 'Developer', icon: 'Code', path: '/developer' }",
        ],
        mobileTabs: [
          "{ label: 'Discover', icon: 'Compass', path: '/plugins' }",
          "{ label: 'Plugins', icon: 'Puzzle', path: '/plugins/list' }",
          "{ label: 'Categories', icon: 'Tags', path: '/categories' }",
          "{ label: 'Search', icon: 'Search', path: '/search' }",
          "{ label: 'My', icon: 'User', path: '/developer' }",
        ],
        defaultRoute: '/plugins',
      }

    case 'ecommerce':
      return {
        name: 'E-Commerce',
        appType: 'client',
        layout: 'top-nav',
        navigationObj:
          "{ visible: true, showLogo: true, showSearch: true, showCart: true, authStyle: 'icon', navItems: 'desktop' }",
        desktopNav: [
          "{ label: 'Home', icon: 'Home', path: '/' }",
          "{ label: 'Products', icon: 'ShoppingBag', path: '/products' }",
          "{ label: 'Cart', icon: 'ShoppingCart', path: '/cart' }",
          "{ label: 'Orders', icon: 'Package', path: '/orders' }",
          "{ label: 'Account', icon: 'User', path: '/content' }",
        ],
        mobileTabs: [
          "{ label: 'Home', icon: 'Home', path: '/' }",
          "{ label: 'Products', icon: 'ShoppingBag', path: '/products' }",
          "{ label: 'Cart', icon: 'ShoppingCart', path: '/cart' }",
          "{ label: 'Orders', icon: 'Package', path: '/orders' }",
          "{ label: 'Me', icon: 'User', path: '/content' }",
        ],
        defaultRoute: '/',
      }

    case 'saas':
      return {
        name: 'SaaS Admin',
        appType: 'admin',
        layout: 'minimal',
        navigationObj:
          "{ visible: false, showLogo: false, showSearch: false, showCart: false, authStyle: 'none', navItems: 'none' }",
        desktopNav: [
          "{ label: 'Dashboard', icon: 'LayoutDashboard', path: '/dashboard' }",
          "{ label: 'Settings', icon: 'Settings', path: '/settings' }",
        ],
        mobileTabs: [
          "{ label: 'Dashboard', icon: 'LayoutDashboard', path: '/dashboard' }",
          "{ label: 'Settings', icon: 'Settings', path: '/settings' }",
        ],
        defaultRoute: '/dashboard',
      }

    case 'community':
      return {
        name: 'Community Forum',
        appType: 'client',
        layout: 'top-nav',
        navigationObj:
          "{ visible: true, showLogo: true, showSearch: true, showCart: false, authStyle: 'text-link', navItems: 'desktop' }",
        desktopNav: [
          "{ label: 'Home', icon: 'Home', path: '/' }",
          "{ label: 'Topics', icon: 'MessageSquare', path: '/topics' }",
          "{ label: 'Popular', icon: 'Flame', path: '/popular' }",
          "{ label: 'Profile', icon: 'User', path: '/profile' }",
          "{ label: 'Chat', icon: 'MessageCircle', path: '/websocket' }",
        ],
        mobileTabs: [
          "{ label: 'Home', icon: 'Home', path: '/' }",
          "{ label: 'Topics', icon: 'MessageSquare', path: '/topics' }",
          "{ label: 'Popular', icon: 'Flame', path: '/popular' }",
          "{ label: 'Profile', icon: 'User', path: '/profile' }",
          "{ label: 'Chat', icon: 'MessageCircle', path: '/websocket' }",
        ],
        defaultRoute: '/',
      }

    default:
      return {
        name: 'App',
        appType: 'client',
        layout: 'top-nav',
        navigationObj:
          "{ visible: true, showLogo: true, showSearch: false, showCart: false, authStyle: 'none', navItems: 'desktop' }",
        desktopNav: ["{ label: 'Home', icon: 'Home', path: '/' }"],
        mobileTabs: ["{ label: 'Home', icon: 'Home', path: '/' }"],
        defaultRoute: '/',
      }
  }
}

function filterNavByModules(navItems: string[], resolved: ResolvedPreset): string[] {
  const hasModule = (path: string) => {
    if (path === '/todos') return resolved.modules.has('todos')
    if (path === '/notifications') return resolved.modules.has('notifications')
    if (path === '/websocket') return resolved.modules.has('chat')
    if (
      path.startsWith('/plugins') ||
      path === '/categories' ||
      path === '/search' ||
      path === '/publish' ||
      path === '/developer'
    )
      return resolved.modules.has('plugin')
    if (path === '/cart' || path === '/orders') return resolved.modules.has('order')
    if (path.startsWith('/content') || path === '/products' || path === '/')
      return resolved.modules.has('content')
    if (path === '/topics' || path === '/popular' || path === '/profile')
      return resolved.modules.has('content')
    if (path === '/dashboard' || path === '/settings') return resolved.modules.has('admin')
    return true
  }
  return navItems.filter(item => {
    const pathMatch = item.match(/path:\s*'([^']+)'/)
    if (!pathMatch) return true
    return hasModule(pathMatch[1])
  })
}

export function generatePresetUIConfig(resolved: ResolvedPreset, presetId: string): string {
  const presetType = getPresetType(presetId)
  const { constName, theme } = getThemeForPresetType(presetType)
  const hasAuth = resolved.modules.has('auth')
  const navConfig = getNavConfigForPreset(presetType, hasAuth)
  const routes = getRoutesForPreset(presetType, resolved)

  // Build aliases: presetId → presetType (only if they differ)
  const aliases: Record<string, string> = {}
  if (presetId !== presetType) {
    aliases[presetId] = presetType
  }
  // Also add common aliases for convenience (e.g., 'fullstack-admin' → 'saas')
  const allAliases: Record<string, string> = {
    'todo-app': 'todo',
    'xbrowser-marketplace': 'plugin',
    ecommerce: 'ecommerce',
    'fullstack-admin': 'saas',
    forum: 'community',
    minimal: 'todo',
    saas: 'saas',
  }
  // Include all aliases that point to the same preset type
  for (const [alias, type] of Object.entries(allAliases)) {
    if (type === presetType && alias !== presetType) {
      aliases[alias] = presetType
    }
  }

  const desktopNav = filterNavByModules(navConfig.desktopNav, resolved)
  const mobileTabs = filterNavByModules(navConfig.mobileTabs, resolved)

  const routeDefs = routes.map(r => {
    return `  {
    path: '${r.path}',
    component: lazy(() => import('${r.importPath}').then(m => ({ default: m.${r.componentName} }))),
    label: '${r.label}',
  }`
  })

  return `import { lazy, type ComponentType } from 'react'

export type PresetType = '${presetType}'

export type AppType = 'client' | 'admin'
export type LayoutType = 'top-nav' | 'minimal'
export type AuthStyle = 'buttons' | 'text-link' | 'icon' | 'avatar' | 'none'

// ClientNavItem is intentionally simpler than admin MenuItem (no permissions/children needed for client nav)
// eslint-disable-next-line local-rules/prefer-shared-types
export interface ClientNavItem {
  label: string
  icon: string
  path: string
}

export type TabItem = ClientNavItem

export interface NavigationConfig {
  visible: boolean
  showLogo: boolean
  showSearch: boolean
  showCart: boolean
  authStyle: AuthStyle
  navItems: 'desktop' | 'none'
}

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
  appType: AppType
  layout: LayoutType
  theme: PresetTheme
  navigation: NavigationConfig
  desktopNav: ClientNavItem[]
  mobileTabs: ClientNavItem[]
  routes: RouteDef[]
  defaultRoute: string
}

const ${constName}: PresetTheme = ${theme}

// Preset ID aliases: allows dev:xxx scripts and VITE_PRESET to use config IDs
const PRESET_ALIASES: Record<string, '${presetType}'> = {
${Object.entries(aliases)
  .map(([k, v]) => `  '${k}': '${v}',`)
  .join('\n')}
}

export const PRESET_UI_CONFIGS: Record<PresetType, PresetUIConfig> = {
  ${presetType}: {
    id: '${presetType}',
    name: '${navConfig.name}',
    appType: '${navConfig.appType}',
    layout: '${navConfig.layout}',
    theme: ${constName},
    navigation: ${navConfig.navigationObj},
    desktopNav: [
${desktopNav.map(i => `      ${i}`).join(',\n')}
    ],
    mobileTabs: [
${mobileTabs.map(i => `      ${i}`).join(',\n')}
    ],
    defaultRoute: '${navConfig.defaultRoute}',
    routes: [
${routeDefs.join(',\n')}
    ],
  },
}

export function getPresetUIConfig(id: string): PresetUIConfig {
  const resolvedId = PRESET_ALIASES[id] ?? (id as PresetType)
  return PRESET_UI_CONFIGS[resolvedId] ?? PRESET_UI_CONFIGS['${presetType}']
}

export function getPresetUIConfigs(): Record<PresetType, PresetUIConfig> {
  return PRESET_UI_CONFIGS
}
`
}

import type { ResolvedPreset } from './template-generator'
import { getClientPages } from './template-generator'

const DEFAULT_ICON = 'Circle'

const ICON_MAP: Record<string, string> = {
  TodoPage: 'CheckCircle',
  NotificationPage: 'Bell',
  WebSocketPage: 'Plug',
  ContentListPage: 'FileText',
  PluginsPage: 'Package',
  CategoriesPage: 'Grid',
  SearchPage: 'Search',
  PublishPage: 'Upload',
  DeveloperDashboardPage: 'Code',
  PluginDetailPage: 'Package',
  TopicsPage: 'Hash',
  ProfilePage: 'User',
  DashboardPage: 'LayoutDashboard',
  SettingsPage: 'Settings',
  CartPage: 'ShoppingCart',
  OrdersPage: 'Package',
}

export function generateClientNavigation(resolved: ResolvedPreset): string {
  const pages = getClientPages(resolved).filter(p => !p.route.includes(':'))
  const hasAuth = resolved.modules.has('auth')

  const navItems: string[] = []
  for (const page of pages) {
    const icon = ICON_MAP[page.name] || DEFAULT_ICON
    const label =
      page.name === 'TodoPage'
        ? 'Todos'
        : page.name === 'NotificationPage'
        ? 'Notifications'
        : page.name === 'WebSocketPage'
        ? 'WebSocket'
        : page.name === 'PluginsPage'
        ? 'Plugins'
        : page.name === 'CategoriesPage'
        ? 'Categories'
        : page.name === 'SearchPage'
        ? 'Search'
        : page.name === 'PublishPage'
        ? 'Publish'
        : page.name === 'DeveloperDashboardPage'
        ? 'Developer'
        : page.name === 'TopicsPage'
        ? 'Topics'
        : page.name === 'ProfilePage'
        ? 'Profile'
        : page.name === 'DashboardPage'
        ? 'Dashboard'
        : page.name === 'SettingsPage'
        ? 'Settings'
        : page.name === 'CartPage'
        ? 'Cart'
        : page.name === 'OrdersPage'
        ? 'Orders'
        : page.route.replace(/^\//, '').charAt(0).toUpperCase() +
          page.route.replace(/^\//, '').slice(1)
    navItems.push(`    { label: '${label}', icon: '${icon}', path: '${page.route}' },`)
  }

  const authImport = hasAuth ? `\nimport { useAuthStore } from '../stores/authStore'` : ''

  const authSection = hasAuth
    ? `
function AuthSection({ style }: { style: string }) {
  const isAuthenticated = useAuthStore((state: any) => state.isAuthenticated)
  const user = useAuthStore((state: any) => state.user)
  const logout = useAuthStore((state: any) => state.logout)

  if (style === 'none') return null

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">{user?.username}</span>
        <button onClick={logout} className="text-xs text-gray-400 hover:text-red-500">Sign Out</button>
      </div>
    )
  }

  if (style === 'buttons') {
    return (
      <div className="flex items-center gap-2">
        <Link
          to="/login"
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Sign In
        </Link>
        <Link
          to="/register"
          className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
        >
          Sign Up
        </Link>
      </div>
    )
  }

  return (
    <Link to="/login" className="text-sm text-gray-500 hover:text-gray-900">
      Login
    </Link>
  )
}
`
    : `
function AuthSection(_style: { style: string }) {
  return null
}
`

  return `import { NavLink${hasAuth ? ', Link' : ''} } from 'react-router-dom'
import { Rocket, Sparkles } from 'lucide-react'${authImport}
import type { PresetTheme, NavigationConfig, ClientNavItem } from '../preset-ui-config'

interface NavigationProps {
  preset?: string
  items?: ClientNavItem[]
  theme?: PresetTheme
  navigation?: NavigationConfig
}
${authSection}
export const Navigation: React.FC<NavigationProps> = ({
  items,
  theme,
  navigation,
}) => {
  const navItems = navigation?.navItems === 'none' ? [] : (items ?? [])
  const primaryColor = theme?.primaryColor ?? '#6366f1'
  const logoText = theme?.logoText ?? 'Biomimic'
  const showLogo = navigation?.showLogo !== false
  const authStyle = navigation?.authStyle ?? 'none'

  return (
    <nav className="hidden md:block bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50" data-testid="app-nav">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        {showLogo && (
          <NavLink to="/" className="flex items-center gap-2 group shrink-0" data-testid="app-title">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow"
              style={{ backgroundColor: primaryColor }}
            >
              <Rocket className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-gray-900 tracking-tight whitespace-nowrap">
              {logoText}
            </span>
            <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: primaryColor }} />
          </NavLink>
        )}

        <div className="flex items-center gap-0.5 overflow-x-auto flex-1 min-w-0 scrollbar-hide">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              data-testid={\`nav-\${item.label.toLowerCase().replace(/\\s+/g, '-')}-button\`}
              className={({ isActive }: { isActive: boolean }) =>
                \`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 shrink-0 whitespace-nowrap \${
                  isActive ? 'text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }\`
              }
              style={
                (({ isActive }: { isActive: boolean }) =>
                  isActive
                    ? { backgroundColor: \`\${primaryColor}15\`, color: primaryColor }
                    : undefined) as never
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        <AuthSection style={authStyle} />
      </div>
    </nav>
  )
}
`
}

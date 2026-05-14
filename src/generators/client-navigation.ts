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

  const authButtonImport = resolved.modules.has('admin')
    ? `\nimport { AuthButton } from './AuthButton'`
    : ''
  const authButtonElement = resolved.modules.has('admin') ? '\n          <AuthButton />' : ''

  return `import { NavLink } from 'react-router-dom'
import { Rocket, Sparkles } from 'lucide-react'${authButtonImport}

interface NavItem {
  label: string
  icon: string
  path: string
}

const NAV_ITEMS: NavItem[] = [
${navItems.join('\n')}
]

export const Navigation: React.FC = () => {
  return (
    <nav className="hidden md:block bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50" data-testid="app-nav">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <NavLink to="/" className="flex items-center gap-2 group" data-testid="app-title">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow bg-indigo-500">
            <Rocket className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-semibold text-gray-900 tracking-tight">Biomimic</span>
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
        </NavLink>

        <div className="flex items-center gap-1">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              data-testid={\`nav-\${item.label.toLowerCase()}-button\`}
              className={({ isActive }) =>
                \`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 \${
                  isActive
                    ? 'text-white'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }\`
              }
              style={(({ isActive }: { isActive: boolean }) =>
                isActive ? { backgroundColor: '#6366f115', color: '#6366f1' } : undefined
              ) as never}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
        <div className="flex items-center gap-4">${authButtonElement}
        </div>
      </div>
    </nav>
  )
}
`
}

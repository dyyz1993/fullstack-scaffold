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

  const iconsNeeded = new Set<string>()
  iconsNeeded.add('Rocket')
  iconsNeeded.add('Sparkles')
  for (const page of pages) {
    const icon = ICON_MAP[page.name] || DEFAULT_ICON
    iconsNeeded.add(icon)
  }

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

  const iconsStr = [...iconsNeeded].join(', ')

  const authButtonImport = resolved.modules.has('admin')
    ? `\nimport { AuthButton } from './AuthButton'`
    : ''
  const authButtonElement = resolved.modules.has('admin') ? '\n          <AuthButton />' : ''

  return `import { NavLink } from 'react-router-dom'
import { ${iconsStr} } from 'lucide-react'${authButtonImport}
import type { ClientNavItem, PresetTheme } from '../preset-ui-config'
import type { PresetType } from '../Layout'

interface NavigationProps {
  preset?: PresetType
  items?: ClientNavItem[]
  theme?: PresetTheme
}

const FALLBACK_ITEMS: ClientNavItem[] = [
${navItems.join('\n')}
]

export const Navigation: React.FC<NavigationProps> = ({ items, theme }) => {
  const navItems = items ?? FALLBACK_ITEMS
  const primaryColor = theme?.primaryColor ?? '#6366f1'
  const logoText = theme?.logoText ?? 'Biomimic'

  return (
    <nav className="hidden md:block bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50" data-testid="app-nav">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <NavLink to="/" className="flex items-center gap-2 group" data-testid="app-title">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow"
            style={{ backgroundColor: primaryColor }}
          >
            <Rocket className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-semibold text-gray-900 tracking-tight">{logoText}</span>
          <Sparkles className="w-3.5 h-3.5" style={{ color: primaryColor }} />
        </NavLink>

        <div className="flex items-center gap-1">
          {navItems.map(item => (
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
                isActive ? { backgroundColor: \`\${primaryColor}15\`, color: primaryColor } : undefined
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

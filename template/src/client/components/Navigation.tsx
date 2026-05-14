import { NavLink } from 'react-router-dom'
import { Rocket, Sparkles } from 'lucide-react'
import { AuthButton } from './AuthButton'
import type { PresetType } from '../Layout'
import type { ClientNavItem, PresetTheme } from '../preset-ui-config'

interface NavigationProps {
  preset?: PresetType
  items?: ClientNavItem[]
  theme?: PresetTheme
}

const FALLBACK_ITEMS: ClientNavItem[] = [
  { label: 'Dashboard', icon: 'LayoutDashboard', path: '/dashboard' },
  { label: 'Settings', icon: 'Settings', path: '/settings' },
]

export const Navigation: React.FC<NavigationProps> = ({
  preset: _preset = 'saas',
  items,
  theme,
}) => {
  const navItems = items ?? FALLBACK_ITEMS
  const primaryColor = theme?.primaryColor ?? '#6366f1'
  const logoText = theme?.logoText ?? 'Biomimic'

  return (
    <nav
      className="hidden md:block bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50"
      data-testid="app-nav"
    >
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
              data-testid={`nav-${item.label.toLowerCase()}-button`}
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive ? 'text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`
              }
              style={
                (({ isActive }: { isActive: boolean }) =>
                  isActive
                    ? { backgroundColor: `${primaryColor}15`, color: primaryColor }
                    : undefined) as never
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        <AuthButton />
      </div>
    </nav>
  )
}

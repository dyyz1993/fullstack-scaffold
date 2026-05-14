import { NavLink, Link } from 'react-router-dom'
import { Rocket, Sparkles, Search, ShoppingCart, UserCircle, LogIn } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import type { PresetTheme, NavigationConfig, AuthStyle, ClientNavItem } from '../preset-ui-config'

interface NavigationProps {
  preset?: string
  items?: ClientNavItem[]
  theme?: PresetTheme
  navigation?: NavigationConfig
}

function AuthSection({ style }: { style: AuthStyle }) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const user = useAuthStore(state => state.user)
  const logout = useAuthStore(state => state.logout)

  if (style === 'none') return null

  if (isAuthenticated) {
    if (style === 'avatar') {
      return (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium text-gray-700">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <button onClick={logout} className="text-xs text-gray-400 hover:text-gray-600">
            Sign Out
          </button>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">{user?.username}</span>
        <button onClick={logout} className="text-xs text-gray-400 hover:text-red-500">
          Sign Out
        </button>
      </div>
    )
  }

  switch (style) {
    case 'text-link':
      return (
        <Link
          to="/login"
          className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1"
        >
          <LogIn className="w-4 h-4" />
          Login
        </Link>
      )
    case 'icon':
      return (
        <Link to="/login" className="text-gray-400 hover:text-gray-600">
          <UserCircle className="w-6 h-6" />
        </Link>
      )
    case 'avatar':
      return (
        <Link to="/login" className="text-sm text-gray-500 hover:text-gray-900">
          Join
        </Link>
      )
    case 'buttons':
    default:
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
}

export const Navigation: React.FC<NavigationProps> = ({
  preset: _preset = 'todo',
  items,
  theme,
  navigation,
}) => {
  const navItems = navigation?.navItems === 'none' ? [] : items ?? []
  const primaryColor = theme?.primaryColor ?? '#6366f1'
  const logoText = theme?.logoText ?? 'Biomimic'
  const showLogo = navigation?.showLogo !== false
  const showSearch = navigation?.showSearch === true
  const showCart = navigation?.showCart === true
  const authStyle = navigation?.authStyle ?? 'buttons'

  return (
    <nav
      className="hidden md:block bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50"
      data-testid="app-nav"
    >
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        {showLogo && (
          <NavLink
            to="/"
            className="flex items-center gap-2 group shrink-0"
            data-testid="app-title"
          >
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

        {showSearch && (
          <div className="flex-1 max-w-md mx-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-0.5 overflow-x-auto flex-1 min-w-0 scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}-button`}
              className={({ isActive }: { isActive: boolean }) =>
                `px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 shrink-0 whitespace-nowrap ${
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

        {showCart && (
          <Link to="/cart" className="relative text-gray-500 hover:text-gray-700 mr-2">
            <ShoppingCart className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
              3
            </span>
          </Link>
        )}

        <AuthSection style={authStyle} />
      </div>
    </nav>
  )
}

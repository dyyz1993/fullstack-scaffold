import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Sun,
  Calendar,
  FolderKanban,
  Compass,
  Puzzle,
  Tags,
  Code,
  Home,
  ShoppingCart,
  Package,
  Hash,
  TrendingUp,
  Bell,
  User,
  LayoutDashboard,
  Settings,
  Search,
  PlusCircle,
  type LucideIcon,
} from 'lucide-react'
import type { TabItem, PresetTheme } from '../preset-ui-config'

interface BottomTabBarProps {
  tabs: TabItem[]
  theme?: PresetTheme
}

const ICON_MAP: Record<string, LucideIcon> = {
  Sun,
  Calendar,
  FolderKanban,
  Compass,
  Puzzle,
  Tags,
  Code,
  Home,
  ShoppingCart,
  Package,
  Hash,
  TrendingUp,
  Bell,
  User,
  LayoutDashboard,
  Settings,
  Search,
  PlusCircle,
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ tabs, theme }) => {
  const location = useLocation()
  const [activeTab, setActiveTab] = useState(() => {
    const match = tabs.find(tab => location.pathname.startsWith(tab.path))
    return match?.path || tabs[0]?.path || ''
  })

  const primaryColor = theme?.primaryColor ?? '#6366f1'

  if (tabs.length === 0) return null

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200 safe-area-inset-bottom"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      data-testid="bottom-tab-bar"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map(tab => {
          const Icon = ICON_MAP[tab.icon] || LayoutDashboard
          const isActive = activeTab === tab.path || location.pathname.startsWith(tab.path)

          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              onClick={() => setActiveTab(tab.path)}
              data-testid={`bottom-tab-${tab.label.toLowerCase()}`}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-xl transition-all duration-200 min-w-0 ${
                isActive ? '' : 'text-gray-400 hover:text-gray-600'
              }`}
              style={{ color: isActive ? primaryColor : undefined }}
            >
              <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
              <span
                className={`text-[10px] font-medium leading-tight truncate w-full text-center px-1 ${
                  isActive ? 'font-semibold' : ''
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <div
                  className="absolute top-0 w-8 h-0.5 rounded-full"
                  style={{ backgroundColor: primaryColor }}
                />
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

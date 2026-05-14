import { ReactNode } from 'react'
import { Navigation } from './components/Navigation'
import { Footer } from './components/Footer'
import { BottomTabBar } from './components/BottomTabBar'
import type { PresetTheme, ClientNavItem, TabItem } from './preset-ui-config'

export type PresetType = 'todo' | 'plugin' | 'ecommerce' | 'community' | 'saas'

interface LayoutProps {
  children: ReactNode
  className?: string
  showNavigation?: boolean
  showFooter?: boolean
  preset?: PresetType
  theme?: PresetTheme
  desktopNav?: ClientNavItem[]
  mobileTabs?: TabItem[]
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  className: classNameProp = '',
  showNavigation = true,
  showFooter = true,
  preset = 'saas',
  theme,
  desktopNav,
  mobileTabs,
}) => {
  const cssVars = theme
    ? ({
        '--preset-primary': theme.primaryColor,
        '--preset-primary-hover': theme.primaryHover,
        '--preset-bg': theme.bgColor,
        '--preset-text': theme.textColor,
        '--preset-secondary-bg': theme.secondaryBg,
        '--preset-border': theme.borderColor,
        '--preset-radius': theme.borderRadius,
      } as React.CSSProperties)
    : undefined

  return (
    <div
      className={`min-h-screen bg-white text-gray-900 ${classNameProp}`}
      style={{
        fontFamily:
          theme?.fontFamily ?? "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        ...cssVars,
      }}
      data-testid="app-container"
    >
      {showNavigation && <Navigation preset={preset} items={desktopNav} theme={theme} />}

      <main
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8"
        data-testid="app-main"
      >
        {children}
      </main>

      {showFooter && <Footer />}

      {mobileTabs && mobileTabs.length > 0 && <BottomTabBar tabs={mobileTabs} theme={theme} />}
    </div>
  )
}

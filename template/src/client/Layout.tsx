import { ReactNode } from 'react'
import { Navigation } from './components/Navigation'
import { Footer } from './components/Footer'
import { BottomTabBar } from './components/BottomTabBar'
import type {
  PresetTheme,
  ClientNavItem,
  TabItem,
  LayoutType,
  NavigationConfig,
} from './preset-ui-config'

export type PresetType = string

interface LayoutProps {
  children: ReactNode
  className?: string
  preset?: PresetType
  layout?: LayoutType
  theme?: PresetTheme
  navigation?: NavigationConfig
  desktopNav?: ClientNavItem[]
  mobileTabs?: TabItem[]
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  className: classNameProp = '',
  preset = 'todo',
  layout = 'top-nav',
  theme,
  navigation,
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

  const navVisible = navigation?.visible !== false
  const showFooter = layout === 'top-nav'

  return (
    <div
      className={`min-h-screen bg-white text-gray-900 ${classNameProp}`}
      style={{
        fontFamily:
          theme?.fontFamily ?? "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        ...cssVars,
        overflowX: 'hidden',
      }}
      data-testid="app-container"
    >
      {navVisible && layout === 'top-nav' && (
        <Navigation preset={preset} items={desktopNav} theme={theme} navigation={navigation} />
      )}

      {layout === 'minimal' ? (
        <main data-testid="app-main">{children}</main>
      ) : (
        <main
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8"
          data-testid="app-main"
        >
          {children}
        </main>
      )}

      {showFooter && <Footer />}

      {mobileTabs && mobileTabs.length > 0 && layout !== 'minimal' && (
        <BottomTabBar tabs={mobileTabs} theme={theme} />
      )}
    </div>
  )
}

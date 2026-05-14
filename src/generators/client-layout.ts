import type { ResolvedPreset } from './template-generator'

export function generateClientLayout(_resolved: ResolvedPreset): string {
  return `import { ReactNode } from 'react'
import { Navigation } from './components/Navigation'
import { Footer } from './components/Footer'

interface LayoutProps {
  children: ReactNode
  className?: string
  showNavigation?: boolean
  showFooter?: boolean
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  className = '',
  showNavigation = true,
  showFooter = true,
}) => {
  return (
    <div className={\`min-h-screen bg-white text-gray-900 \${className}\`} data-testid="app-container">
      {showNavigation && <Navigation />}

      <main
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        data-testid="app-main"
      >
        {children}
      </main>

      {showFooter && <Footer />}
    </div>
  )
}
`
}

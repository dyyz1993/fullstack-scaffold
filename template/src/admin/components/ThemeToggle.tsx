import { Sun, Moon } from 'lucide-react'
import { theme } from 'antd'
import { useThemeStore } from '../stores/themeStore'
import { useLanguage } from '../i18n/useLanguage'

export const ThemeToggle: React.FC = () => {
  const { mode, toggleTheme } = useThemeStore()
  const { t } = useLanguage()
  const { token } = theme.useToken()

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
      style={{ color: token.colorText }}
      onMouseEnter={e => {
        e.currentTarget.style.backgroundColor = token.colorFillQuaternary
      }}
      onMouseLeave={e => {
        e.currentTarget.style.backgroundColor = 'transparent'
      }}
      title={mode === 'light' ? t('theme.toggleDark') : t('theme.toggleLight')}
      data-testid="theme-toggle"
    >
      {mode === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
    </button>
  )
}

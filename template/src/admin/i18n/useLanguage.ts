import { useTranslation } from 'react-i18next'

export type Language = 'zh-CN' | 'en-US'

export function useLanguage() {
  const { i18n, t } = useTranslation()

  const currentLanguage = i18n.language as Language

  const changeLanguage = (lang: Language) => {
    i18n.changeLanguage(lang)
    document.documentElement.setAttribute('lang', lang)
  }

  const formatDate = (date: string | Date, options?: Intl.DateTimeFormatOptions): string => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleString(currentLanguage === 'zh-CN' ? 'zh-CN' : 'en-US', options)
  }

  return { t, currentLanguage, changeLanguage, formatDate }
}

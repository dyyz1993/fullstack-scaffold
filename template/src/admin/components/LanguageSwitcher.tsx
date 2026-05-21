import { Select } from 'antd'
import { useLanguage, type Language } from '../i18n/useLanguage'

const LANGUAGE_OPTIONS = [
  { label: '中文', value: 'zh-CN' as Language },
  { label: 'English', value: 'en-US' as Language },
]

export const LanguageSwitcher: React.FC = () => {
  const { currentLanguage, changeLanguage } = useLanguage()

  return (
    <Select
      size="small"
      value={currentLanguage}
      options={LANGUAGE_OPTIONS}
      onChange={changeLanguage}
      style={{ width: 90 }}
      data-testid="language-switcher"
    />
  )
}

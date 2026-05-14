import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Settings as SettingsIcon, Users, CreditCard, Key, Bell, Save } from 'lucide-react'

type TabKey = 'general' | 'team' | 'billing' | 'api-keys' | 'notifications'

interface Tab {
  id: TabKey
  label: string
  icon: React.FC<{ className?: string }>
}

const tabs: Tab[] = [
  { id: 'general', label: 'General', icon: SettingsIcon },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'api-keys', label: 'API Keys', icon: Key },
  { id: 'notifications', label: 'Notifications', icon: Bell },
]

const timezones = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
]

const languages = [
  'English',
  'Chinese (Simplified)',
  'Chinese (Traditional)',
  'Japanese',
  'Korean',
  'Spanish',
  'French',
  'German',
]

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('general')
  const [orgName, setOrgName] = useState('Acme Corp')
  const [orgUrl, setOrgUrl] = useState('acme-corp')
  const [timezone, setTimezone] = useState('America/New_York')
  const [language, setLanguage] = useState('English')

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8" data-testid="settings-page">
      <Helmet>
        <title>Settings - SaaS Admin</title>
        <meta name="description" content="Manage organization settings" />
      </Helmet>

      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your organization settings</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <nav
            className="flex lg:flex-col gap-1 lg:w-56 shrink-0 overflow-x-auto lg:overflow-visible"
            data-testid="settings-tabs"
          >
            {tabs.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  data-testid={`tab-${tab.id}`}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </nav>

          <div className="flex-1 min-w-0">
            {activeTab === 'general' && (
              <div
                className="bg-white rounded-lg border border-gray-200 p-5 sm:p-6"
                data-testid="general-settings-content"
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-6">General Settings</h2>

                <div className="space-y-5 max-w-lg">
                  <div>
                    <label
                      htmlFor="org-name"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Organization Name
                    </label>
                    <input
                      id="org-name"
                      type="text"
                      value={orgName}
                      onChange={e => setOrgName(e.target.value)}
                      data-testid="input-org-name"
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-800 focus:border-transparent outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="org-url"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Organization URL
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3.5 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-sm text-gray-500">
                        https://
                      </span>
                      <input
                        id="org-url"
                        type="text"
                        value={orgUrl}
                        onChange={e => setOrgUrl(e.target.value)}
                        data-testid="input-org-url"
                        className="flex-1 px-3.5 py-2.5 text-sm border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-gray-800 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      This will be your organization&apos;s public URL
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="timezone"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Timezone
                    </label>
                    <select
                      id="timezone"
                      value={timezone}
                      onChange={e => setTimezone(e.target.value)}
                      data-testid="select-timezone"
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-800 focus:border-transparent outline-none transition-all bg-white"
                    >
                      {timezones.map(tz => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="language"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Language
                    </label>
                    <select
                      id="language"
                      value={language}
                      onChange={e => setLanguage(e.target.value)}
                      data-testid="select-language"
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-800 focus:border-transparent outline-none transition-all bg-white"
                    >
                      {languages.map(lang => (
                        <option key={lang} value={lang}>
                          {lang}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-4">
                    <button
                      data-testid="save-settings"
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab !== 'general' && (
              <div
                className="bg-white rounded-lg border border-gray-200 p-5 sm:p-6"
                data-testid={`${activeTab}-settings-content`}
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  {tabs.find(t => t.id === activeTab)?.label} Settings
                </h2>
                <p className="text-sm text-gray-500">
                  {activeTab === 'team' && 'Manage team members and permissions.'}
                  {activeTab === 'billing' && 'Manage billing and subscription details.'}
                  {activeTab === 'api-keys' && 'Manage API keys for integrations.'}
                  {activeTab === 'notifications' && 'Configure notification preferences.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

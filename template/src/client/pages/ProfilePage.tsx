import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { MessageSquare, FileText, ThumbsUp, Pencil } from 'lucide-react'
import { apiClient } from '@client/services/apiClient'
import { LoadingSpinner } from '@client/components'
import type { ProfileStats, ProfileActivity } from '@shared/schemas'

type ProfileTab = 'activity' | 'topics' | 'replies'

interface ProfileData {
  name: string
  initials: string
  joinedDate: string
  bio: string
}

const DEFAULT_PROFILE: ProfileData = {
  name: 'Jane Doe',
  initials: 'JD',
  joinedDate: 'March 2025',
  bio: 'Full-stack developer passionate about real-time web apps, type safety, and building developer tools.',
}

const DEFAULT_STATS: ProfileStats = {
  topics: 0,
  replies: 0,
  likes: 0,
}

const TABS: { value: ProfileTab; label: string }[] = [
  { value: 'activity', label: 'Activity' },
  { value: 'topics', label: 'Topics' },
  { value: 'replies', label: 'Replies' },
]

const activityIcon = (type: ProfileActivity['type']) => {
  switch (type) {
    case 'topic':
      return <FileText className="w-4 h-4" />
    case 'reply':
      return <MessageSquare className="w-4 h-4" />
    case 'like':
      return <ThumbsUp className="w-4 h-4" />
  }
}

const activityColor = (type: ProfileActivity['type']) => {
  switch (type) {
    case 'topic':
      return 'bg-emerald-100 text-emerald-600'
    case 'reply':
      return 'bg-blue-100 text-blue-600'
    case 'like':
      return 'bg-rose-100 text-rose-500'
  }
}

export const ProfilePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('activity')
  const [profile, setProfile] = useState<ProfileData>(DEFAULT_PROFILE)
  const [stats, setStats] = useState<ProfileStats>(DEFAULT_STATS)
  const [activity, setActivity] = useState<ProfileActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await apiClient.api.profile.$get()
        const result = await res.json()
        if (result.success) {
          const d = result.data as Record<string, unknown>
          if (d.profile) {
            setProfile(d.profile as ProfileData)
          }
          if (d.stats) {
            setStats(d.stats as ProfileStats)
          }
          if (d.activity) {
            setActivity(d.activity as ProfileActivity[])
          }
        }
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  const filteredActivity =
    activeTab === 'activity'
      ? activity
      : activity.filter(a => {
          if (activeTab === 'topics') return a.type === 'topic'
          if (activeTab === 'replies') return a.type === 'reply'
          return true
        })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" data-testid="profile-loading">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white" data-testid="profile-page">
      <Helmet>
        <title>Profile — Community</title>
        <meta name="description" content="Community user profile" />
      </Helmet>

      <div className="bg-gradient-to-b from-emerald-50 to-white pt-12 pb-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="w-20 h-20 rounded-full bg-emerald-500 text-white text-2xl font-bold flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0">
              {profile.initials}
            </div>
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
              <p className="text-sm text-gray-500 mt-0.5">Joined {profile.joinedDate}</p>
              <p className="text-gray-600 mt-2 text-sm leading-relaxed max-w-md">{profile.bio}</p>
            </div>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-xl shadow-sm shadow-emerald-500/25 transition-colors self-center sm:self-start shrink-0">
              <Pencil className="w-3.5 h-3.5" />
              Edit Profile
            </button>
          </div>

          <div className="flex justify-center sm:justify-start gap-6 mt-6">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{stats.topics}</div>
              <div className="text-xs text-gray-500">Topics</div>
            </div>
            <div className="w-px bg-gray-200" />
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{stats.replies}</div>
              <div className="text-xs text-gray-500">Replies</div>
            </div>
            <div className="w-px bg-gray-200" />
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{stats.likes}</div>
              <div className="text-xs text-gray-500">Likes</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-6 pb-16">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6">
          {TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {filteredActivity.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gray-100 rounded-full mb-3">
              <FileText className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm">No items yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredActivity.map((item, index) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="relative">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${activityColor(
                      item.type
                    )}`}
                  >
                    {activityIcon(item.type)}
                  </div>
                  {index < filteredActivity.length - 1 && (
                    <div className="absolute top-8 left-1/2 -translate-x-px w-0.5 h-[calc(100%+4px)] bg-gray-100" />
                  )}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    <span className="text-gray-500">{item.text}</span>{' '}
                    <span className="font-medium text-gray-900">{item.target}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { MessageSquare, FileText, ThumbsUp, Pencil } from 'lucide-react'

type ProfileTab = 'activity' | 'topics' | 'replies'

interface ProfileStats {
  topics: number
  replies: number
  likes: number
}

interface ActivityItem {
  id: string
  type: 'topic' | 'reply' | 'like'
  text: string
  target: string
  time: string
}

const STATS: ProfileStats = {
  topics: 12,
  replies: 48,
  likes: 156,
}

const MOCK_ACTIVITY: ActivityItem[] = [
  {
    id: '1',
    type: 'reply',
    text: 'Replied to',
    target: 'How to implement real-time notifications with SSE?',
    time: '2h ago',
  },
  {
    id: '2',
    type: 'topic',
    text: 'Created topic',
    target: 'Best practices for WebSocket reconnection logic',
    time: '5h ago',
  },
  {
    id: '3',
    type: 'like',
    text: 'Liked',
    target: 'Type-safe API routes with Hono RPC — a complete guide',
    time: '8h ago',
  },
  {
    id: '4',
    type: 'reply',
    text: 'Replied to',
    target: 'Deploying Hono apps to Cloudflare Workers with D1',
    time: '1d ago',
  },
  {
    id: '5',
    type: 'topic',
    text: 'Created topic',
    target: 'Zustand vs Jotai — which state manager for community apps?',
    time: '2d ago',
  },
  {
    id: '6',
    type: 'like',
    text: 'Liked',
    target: 'Building a plugin system with module manifests',
    time: '3d ago',
  },
  {
    id: '7',
    type: 'reply',
    text: 'Replied to',
    target: 'How to set up CI/CD for monorepo projects',
    time: '4d ago',
  },
  {
    id: '8',
    type: 'topic',
    text: 'Created topic',
    target: 'Tailwind CSS v4 migration guide and tips',
    time: '5d ago',
  },
]

const TABS: { value: ProfileTab; label: string }[] = [
  { value: 'activity', label: 'Activity' },
  { value: 'topics', label: 'Topics' },
  { value: 'replies', label: 'Replies' },
]

const activityIcon = (type: ActivityItem['type']) => {
  switch (type) {
    case 'topic':
      return <FileText className="w-4 h-4" />
    case 'reply':
      return <MessageSquare className="w-4 h-4" />
    case 'like':
      return <ThumbsUp className="w-4 h-4" />
  }
}

const activityColor = (type: ActivityItem['type']) => {
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

  const filteredActivity =
    activeTab === 'activity'
      ? MOCK_ACTIVITY
      : MOCK_ACTIVITY.filter(a => {
          if (activeTab === 'topics') return a.type === 'topic'
          if (activeTab === 'replies') return a.type === 'reply'
          return true
        })

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
              JD
            </div>
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-2xl font-bold text-gray-900">Jane Doe</h1>
              <p className="text-sm text-gray-500 mt-0.5">Joined March 2025</p>
              <p className="text-gray-600 mt-2 text-sm leading-relaxed max-w-md">
                Full-stack developer passionate about real-time web apps, type safety, and building
                developer tools.
              </p>
            </div>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-xl shadow-sm shadow-emerald-500/25 transition-colors self-center sm:self-start shrink-0">
              <Pencil className="w-3.5 h-3.5" />
              Edit Profile
            </button>
          </div>

          <div className="flex justify-center sm:justify-start gap-6 mt-6">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{STATS.topics}</div>
              <div className="text-xs text-gray-500">Topics</div>
            </div>
            <div className="w-px bg-gray-200" />
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{STATS.replies}</div>
              <div className="text-xs text-gray-500">Replies</div>
            </div>
            <div className="w-px bg-gray-200" />
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{STATS.likes}</div>
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

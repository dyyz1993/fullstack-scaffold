import { useState, useEffect, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ChevronUp, ChevronDown, MessageSquare, Eye, Search, Plus } from 'lucide-react'
import { apiClient } from '@client/services/apiClient'
import { LoadingSpinner } from '@client/components'
import type { TopicStatus, Topic } from '@shared/schemas'

type FilterType = 'all' | TopicStatus

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'hot', label: 'Hot' },
  { value: 'unanswered', label: 'Unanswered' },
  { value: 'solved', label: 'Solved' },
]

export const TopicsPage: React.FC = () => {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTopics() {
      try {
        const endpoint = filter === 'hot' ? apiClient.api.topics.popular : apiClient.api.topics
        const res = await endpoint.$get()
        const result = await res.json()
        if (result.success) {
          const d = result.data as unknown
          setTopics(Array.isArray(d) ? d : ((d as Record<string, unknown>).topics as Topic[]) ?? [])
        }
      } finally {
        setLoading(false)
      }
    }
    fetchTopics()
  }, [filter])

  const filteredTopics = useMemo(() => {
    if (!search.trim()) return topics
    const q = search.toLowerCase()
    return topics.filter(
      t =>
        t.title.toLowerCase().includes(q) ||
        t.excerpt.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.label.toLowerCase().includes(q))
    )
  }, [search, topics])

  const voteColor = (votes: number) =>
    votes > 0 ? 'text-emerald-600' : votes < 0 ? 'text-red-500' : 'text-gray-400'

  return (
    <div className="min-h-screen bg-white" data-testid="topics-page">
      <Helmet>
        <title>Community Forum</title>
        <meta name="description" content="Browse and discuss community topics" />
      </Helmet>

      <div className="bg-gradient-to-b from-emerald-50 to-white pt-12 pb-10 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Community Forum</h1>
              <p className="mt-1 text-gray-500">
                Ask questions, share knowledge, connect with others
              </p>
            </div>
            <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl shadow-sm shadow-emerald-500/25 transition-colors self-start sm:self-auto">
              <Plus className="w-4 h-4" />
              Ask Question
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-4 pb-16">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search topics..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-shadow text-sm"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  filter === f.value
                    ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/25'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20" data-testid="topics-loading">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredTopics.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <MessageSquare className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No topics found</h3>
            <p className="text-gray-500 text-sm">Try adjusting your search or filter</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTopics.map(topic => (
              <NavLink
                key={topic.id}
                to={`/topics/${topic.id}`}
                className="flex gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-500/5 transition-all group"
              >
                <div className="flex flex-col items-center gap-0.5 pt-0.5 min-w-[48px]">
                  <ChevronUp className="w-4 h-4 text-gray-400 hover:text-emerald-500 cursor-pointer" />
                  <span className={`text-sm font-bold ${voteColor(topic.votes)}`}>
                    {topic.votes}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400 hover:text-red-400 cursor-pointer" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 group-hover:underline decoration-emerald-400 underline-offset-2 leading-snug">
                    {topic.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2 leading-relaxed">
                    {topic.excerpt}
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    {topic.tags.map(tag => (
                      <span
                        key={tag.label}
                        className={`px-2.5 py-0.5 rounded-lg text-xs font-medium ${tag.color}`}
                      >
                        {tag.label}
                      </span>
                    ))}
                    <span className="text-xs text-gray-400 mx-1">·</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center justify-center">
                        {topic.author.initials}
                      </div>
                      <span className="text-xs text-gray-600">{topic.author.name}</span>
                      <span className="text-xs text-gray-400">{topic.createdAt}</span>
                    </div>
                  </div>
                </div>

                <div className="hidden sm:flex flex-col items-end justify-center gap-1 text-xs text-gray-400 min-w-[80px]">
                  <div className="flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{topic.replyCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{topic.viewCount}</span>
                  </div>
                </div>
              </NavLink>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import type { Content, ContentCategory, ContentStatus } from '@shared/modules/content'
import { apiClient } from '@client/services/apiClient'

const CATEGORIES: { value: ContentCategory | ''; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'article', label: '文章' },
  { value: 'announcement', label: '公告' },
  { value: 'tutorial', label: '教程' },
  { value: 'news', label: '新闻' },
  { value: 'policy', label: '政策' },
]

export const ContentListPage: React.FC = () => {
  const [contents, setContents] = useState<Content[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState<ContentCategory | ''>('')
  const [search, setSearch] = useState('')

  const fetchContents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.api.public.contents.$get({
        query: {
          ...(category ? { category } : {}),
          ...(search ? { search } : {}),
          limit: 20,
        },
      })
      const result = await res.json()
      if (result.success) {
        setContents(result.data)
      } else {
        setError('Failed to fetch contents')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [category, search])

  useEffect(() => {
    fetchContents()
  }, [fetchContents])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchContents()
  }

  const categoryLabel = (cat: ContentCategory) => {
    return CATEGORIES.find(c => c.value === cat)?.label ?? cat
  }

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const statusConfig = (status: ContentStatus) => {
    const configs = {
      draft: { color: 'bg-yellow-100 text-yellow-700', label: '草稿' },
      published: { color: 'bg-green-100 text-green-700', label: '已发布' },
      archived: { color: 'bg-gray-100 text-gray-700', label: '已归档' },
    }
    return configs[status]
  }

  return (
    <>
      <Helmet>
        <title>内容 - Biomimic App</title>
        <meta name="description" content="浏览最新的文章、公告、教程和新闻" />
        <meta property="og:title" content="内容 - Biomimic App" />
        <meta property="og:description" content="浏览最新的文章、公告、教程和新闻" />
      </Helmet>

      <div className="max-w-4xl mx-auto p-6" data-testid="content-list-page">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">内容中心</h1>
          <p className="mt-2 text-gray-600">浏览最新的文章、公告、教程和新闻</p>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  category === cat.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearch} className="flex gap-2 sm:ml-auto">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索内容..."
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              搜索
            </button>
          </form>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {loading && <div className="text-center py-12 text-gray-500">加载中...</div>}

        {!loading && !error && contents.length === 0 && (
          <div className="text-center py-12 text-gray-500">暂无内容</div>
        )}

        {!loading && contents.length > 0 && (
          <div className="space-y-4">
            {contents.map(content => (
              <Link
                key={content.id}
                to={`/content/${content.id}`}
                className="block p-6 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                        {categoryLabel(content.category)}
                      </span>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          statusConfig(content.status).color
                        }`}
                      >
                        {statusConfig(content.status).label}
                      </span>
                      <span className="text-sm text-gray-500">{content.author}</span>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">{content.title}</h2>
                    <p className="text-gray-600 line-clamp-2">{content.content.slice(0, 150)}...</p>
                    {content.tags && content.tags.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap mt-3">
                        {content.tags.map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-400 flex-wrap">
                      {content.createdAt && <span>创建于 {formatDate(content.createdAt)}</span>}
                      {content.updatedAt && content.updatedAt !== content.createdAt && (
                        <span>更新于 {formatDate(content.updatedAt)}</span>
                      )}
                      {content.publishedAt && <span>发布于 {formatDate(content.publishedAt)}</span>}
                      <span>👁 {content.viewCount}</span>
                      <span>❤ {content.likeCount}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

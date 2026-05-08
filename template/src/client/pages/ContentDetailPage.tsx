import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import type { Content } from '@shared/modules/content'

export const ContentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [content, setContent] = useState<Content | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) fetchContent(id)
  }, [id])

  const fetchContent = async (contentId: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/public/contents/${contentId}`)
      if (!res.ok) {
        if (res.status === 404) {
          setError('内容不存在')
        } else {
          setError('加载失败')
        }
        return
      }
      const result = (await res.json()) as {
        success: boolean
        data?: Content
        error?: string
      }
      if (result.success) {
        setContent(result.data ?? null)
      } else {
        setError(result.error || 'Failed to fetch content')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12 text-gray-500">加载中...</div>
      </div>
    )
  }

  if (error || !content) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {error || '内容不存在'}
          </h1>
          <Link to="/content" className="text-blue-600 hover:underline">
            ← 返回内容列表
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <Helmet>
        <title>{content.title} - Biomimic App</title>
        <meta name="description" content={content.content.slice(0, 160)} />
        <meta property="og:title" content={content.title} />
        <meta property="og:description" content={content.content.slice(0, 200)} />
        <meta property="og:type" content="article" />
        {content.publishedAt && (
          <meta property="article:published_time" content={content.publishedAt} />
        )}
        {content.author && <meta property="article:author" content={content.author} />}
        {content.tags?.map(tag => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}
      </Helmet>

      <div className="max-w-4xl mx-auto p-6" data-testid="content-detail-page">
        <nav className="mb-6 text-sm text-gray-500">
          <Link to="/content" className="hover:text-blue-600">
            内容中心
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{content.category}</span>
        </nav>

        <article className="bg-white rounded-xl border border-gray-200 p-8">
          <header className="mb-8 pb-6 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                {content.category}
              </span>
              {content.tags?.map(tag => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{content.title}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              {content.author && <span>✍ {content.author}</span>}
              {content.publishedAt && <span>📅 {formatDate(content.publishedAt)}</span>}
              <span>👁 {content.viewCount} 阅读</span>
              <span>❤ {content.likeCount} 喜欢</span>
            </div>
          </header>

          <div className="prose prose-gray max-w-none">
            <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
              {content.content}
            </div>
          </div>
        </article>

        <div className="mt-6">
          <Link to="/content" className="text-blue-600 hover:underline">
            ← 返回内容列表
          </Link>
        </div>
      </div>
    </>
  )
}

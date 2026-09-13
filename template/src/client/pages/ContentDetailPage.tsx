import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ShoppingCart, Check } from 'lucide-react'
import type { Content } from '@shared/modules/content'
import { apiClient } from '@client/services/apiClient'
import { usePreset } from '../contexts/PresetContext'
import { useCartStore, demoPriceFor } from '../stores/cartStore'

// SSR 首帧数据：ISR 服务端写入 __SSR_DATA__.content（详情页按 id 匹配）
function ssrInitialContent(id?: string): Content | null {
  try {
    const d = (globalThis as { __SSR_DATA__?: { content?: Content | null } }).__SSR_DATA__
    const c = d?.content ?? null
    return c && (!id || c.id === id) ? c : null
  } catch {
    return null
  }
}

export const ContentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const preset = usePreset()
  const addItem = useCartStore(state => state.addItem)
  const [addedToCart, setAddedToCart] = useState(false)
  const [content, setContent] = useState<Content | null>(() => ssrInitialContent(id))
  const [loading, setLoading] = useState(() => ssrInitialContent(id) === null)
  const [error, setError] = useState<string | null>(null)

  const fetchContent = useCallback(async (contentId: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.api.public.contents[':id'].$get({
        param: { id: contentId },
      })
      if (!res.ok) {
        if (res.status === 404) {
          setError('内容不存在')
        } else {
          setError('加载失败')
        }
        return
      }
      const result = await res.json()
      if (result.success) {
        setContent(result.data ?? null)
      } else {
        setError('Failed to fetch content')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (id) fetchContent(id)
  }, [id, fetchContent])

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
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{error || '内容不存在'}</h1>
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
                <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
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

        {/* ecommerce preset：内容即商品，提供加购闭环（后端 cart 为演示 mock，购物车本地持久化） */}
        {preset === 'ecommerce' && content.id && (
          <div
            className="mt-6 flex items-center justify-between bg-white rounded-xl border border-gray-200 p-5"
            data-testid="purchase-bar"
          >
            <div>
              <span className="text-2xl font-bold text-amber-600">
                ${demoPriceFor(content.id).toFixed(2)}
              </span>
              <span className="text-sm text-gray-400 ml-2">数字商品 · 即买即得</span>
            </div>
            <button
              onClick={() => {
                if (!content.id) return
                addItem({
                  id: Math.abs([...content.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0)),
                  name: content.title,
                  variant: '数字版',
                  price: demoPriceFor(content.id),
                  color: 'Amber',
                })
                setAddedToCart(true)
              }}
              data-testid="add-to-cart"
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all shadow-md ${
                addedToCart
                  ? 'bg-emerald-500 cursor-default'
                  : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/25'
              }`}
            >
              {addedToCart ? (
                <>
                  <Check className="w-5 h-5" />
                  已加入购物车
                </>
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5" />
                  加入购物车
                </>
              )}
            </button>
          </div>
        )}

        <div className="mt-6">
          <Link to="/content" className="text-blue-600 hover:underline">
            ← 返回内容列表
          </Link>
        </div>
      </div>
    </>
  )
}

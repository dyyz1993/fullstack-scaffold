import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ShoppingCart, Check, MessageCircle, Send } from 'lucide-react'
import type { Content, ContentComment } from '@shared/modules/content'
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

function readAuthSnapshot(): { authed: boolean; username: string | null } {
  try {
    const raw = localStorage.getItem('auth-token')
    const state = raw ? JSON.parse(raw)?.state : null
    return { authed: !!state?.isAuthenticated, username: state?.user?.username ?? null }
  } catch {
    return { authed: false, username: null }
  }
}

export const ContentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const preset = usePreset()
  const addItem = useCartStore(state => state.addItem)
  // 登录态零依赖读取（与 MobileAuthBar 同模式）：本页在无 auth 模块的
  // preset（如 ecommerce）也会生成，authStore 不存在，不能静态 import
  const [auth, setAuth] = useState(() => readAuthSnapshot())
  const isAuthenticated = auth.authed
  const currentUser = auth.authed ? { username: auth.username ?? 'User' } : null
  const [addedToCart, setAddedToCart] = useState(false)
  const [content, setContent] = useState<Content | null>(() => ssrInitialContent(id))
  const [loading, setLoading] = useState(() => ssrInitialContent(id) === null)
  const [error, setError] = useState<string | null>(null)
  const [comments, setComments] = useState<ContentComment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentBody, setCommentBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [commentError, setCommentError] = useState<string | null>(null)

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

  const fetchComments = useCallback(async (contentId: string) => {
    setCommentsLoading(true)
    try {
      const res = await apiClient.api.contents[':id'].comments.$get({
        param: { id: contentId },
      })
      if (res.ok) {
        const result = await res.json()
        if (result.success) {
          setComments(result.data?.comments ?? [])
        }
      }
    } catch {
      // 评论区加载失败不阻塞正文展示
    } finally {
      setCommentsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (id) fetchComments(id)
  }, [id, fetchComments])

  // 登录/登出后同步评论区身份（轮询轻同步，与 MobileAuthBar 一致）
  useEffect(() => {
    const timer = window.setInterval(() => setAuth(readAuthSnapshot()), 1200)
    return () => window.clearInterval(timer)
  }, [])

  const submitComment = useCallback(async () => {
    if (!id || !commentBody.trim() || submitting) return
    setSubmitting(true)
    setCommentError(null)
    try {
      const res = await apiClient.api.contents[':id'].comments.$post({
        param: { id },
        json: { body: commentBody.trim() },
      })
      if (!res.ok) {
        // 401 由 apiClient 统一拦截并跳转 /login，这里提示通用失败文案
        setCommentError('评论发布失败，请重试')
        return
      }
      const result = await res.json()
      if (result.success && result.data) {
        setComments(prev => [...prev, result.data])
        setCommentBody('')
      } else {
        setCommentError('评论发布失败，请重试')
      }
    } catch {
      setCommentError('网络错误，请重试')
    } finally {
      setSubmitting(false)
    }
  }, [id, commentBody, submitting])

  const formatCommentDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
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

        {/* 评论区：游客可浏览，登录用户可发表评论 */}
        <section
          className="mt-6 bg-white rounded-xl border border-gray-200 p-8"
          data-testid="comment-section"
        >
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-6">
            <MessageCircle className="w-5 h-5" />
            评论 ({comments.length})
          </h2>

          {isAuthenticated ? (
            <div className="mb-8" data-testid="comment-form">
              <textarea
                value={commentBody}
                onChange={e => setCommentBody(e.target.value)}
                placeholder={`发表你的看法...（${currentUser?.username ?? '我'}）`}
                rows={3}
                maxLength={2000}
                data-testid="comment-input"
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {commentError ?? `${commentBody.length}/2000`}
                </span>
                <button
                  onClick={submitComment}
                  disabled={submitting || !commentBody.trim()}
                  data-testid="comment-submit"
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? '发布中...' : '发布评论'}
                </button>
              </div>
            </div>
          ) : (
            <div
              className="mb-8 flex items-center justify-between rounded-lg bg-gray-50 px-5 py-4"
              data-testid="comment-login-guide"
            >
              <span className="text-sm text-gray-500">登录后参与讨论，分享你的想法</span>
              <Link
                to="/login"
                data-testid="comment-login-link"
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                登录
              </Link>
            </div>
          )}

          {commentsLoading ? (
            <div className="py-6 text-center text-sm text-gray-400">评论加载中...</div>
          ) : comments.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-400" data-testid="comment-empty">
              还没有评论，来抢沙发吧
            </div>
          ) : (
            <ul className="space-y-6" data-testid="comment-list">
              {comments.map(comment => (
                <li key={comment.id} className="flex gap-3" data-testid="comment-item">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                    {comment.userName.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{comment.userName}</span>
                      <span className="text-xs text-gray-400">
                        {formatCommentDate(comment.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-700">
                      {comment.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mt-6">
          <Link to="/content" className="text-blue-600 hover:underline">
            ← 返回内容列表
          </Link>
        </div>
      </div>
    </>
  )
}

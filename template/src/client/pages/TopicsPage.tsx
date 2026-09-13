import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Hash, MessageSquare, Eye, Heart } from 'lucide-react'
import { LoadingSpinner } from '@client/components'
import { fetchPublicContents, type PublicContentItem } from '@client/services/publicContents'

const CATEGORY_LABELS: Record<string, string> = {
  announcement: '公告',
  article: '文章',
  tutorial: '教程',
  news: '新闻',
  policy: '政策',
}

/** 常见分类的固定展示顺序，未知分类按首次出现顺序排在后面 */
const CATEGORY_ORDER = ['announcement', 'article', 'tutorial', 'news', 'policy']

function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}

/**
 * 话题聚合视图：按分类（content.category）分组展示各话题块，每块列出该
 * 话题下的内容标题链接，并支持按标签过滤。数据来自公开内容 API，纯客户端
 * 本地分组。
 */
export const TopicsPage: React.FC = () => {
  const [contents, setContents] = useState<PublicContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTag, setActiveTag] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const items = await fetchPublicContents(20)
      setContents(items)
      setLoading(false)
    }
    load()
  }, [])

  // 全量标签云（带内容计数），点击在页面内过滤
  const tagCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of contents) {
      for (const tag of c.tags) {
        map.set(tag, (map.get(tag) ?? 0) + 1)
      }
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [contents])

  // 按分类分组（固定顺序 + 未知分类按首现顺序），组内按创建时间倒序
  const groups = useMemo(() => {
    const filtered = activeTag ? contents.filter(c => c.tags.includes(activeTag)) : contents
    const byCategory = new Map<string, PublicContentItem[]>()
    for (const c of filtered) {
      const list = byCategory.get(c.category) ?? []
      list.push(c)
      byCategory.set(c.category, list)
    }
    const keys = [...byCategory.keys()].sort((a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a)
      const ib = CATEGORY_ORDER.indexOf(b)
      if (ia === -1 && ib === -1) return a.localeCompare(b)
      if (ia === -1) return 1
      if (ib === -1) return -1
      return ia - ib
    })
    return keys.map(key => ({
      category: key,
      items: (byCategory.get(key) ?? []).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    }))
  }, [contents, activeTag])

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-emerald-50/60 to-white"
      data-testid="topics-page"
    >
      <Helmet>
        <title>Topics - Community Forum</title>
        <meta name="description" content="Browse community topics grouped by category and tag" />
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 pb-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Topics</h1>
          <p className="mt-1 text-gray-500">按话题分类浏览社区内容聚合</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20" data-testid="topics-loading">
            <LoadingSpinner size="lg" color="text-emerald-500" />
          </div>
        ) : contents.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <MessageSquare className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No topics yet</h3>
            <p className="text-gray-500 text-sm">Published contents will appear here</p>
          </div>
        ) : (
          <>
            {tagCounts.length > 0 && (
              <div className="mb-6 flex flex-wrap items-center gap-2">
                <Hash className="w-4 h-4 text-emerald-600" />
                <button
                  onClick={() => setActiveTag(null)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    activeTag === null
                      ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/25'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-emerald-300'
                  }`}
                >
                  全部
                </button>
                {tagCounts.map(([tag, count]) => (
                  <button
                    key={tag}
                    onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      activeTag === tag
                        ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/25'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-emerald-300'
                    }`}
                  >
                    {tag}
                    <span className="ml-1 text-[10px] opacity-70">{count}</span>
                  </button>
                ))}
              </div>
            )}

            {groups.length === 0 ? (
              <div className="text-center py-16 text-gray-500 text-sm">
                没有匹配标签「{activeTag}」的内容
              </div>
            ) : (
              <div className="space-y-6">
                {groups.map(group => (
                  <section
                    key={group.category}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm shadow-emerald-500/5 overflow-hidden"
                    data-testid={`topic-group-${group.category}`}
                  >
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50 bg-emerald-50/40">
                      <h2 className="flex items-center gap-2 font-semibold text-gray-900">
                        <Hash className="w-4 h-4 text-emerald-600" />
                        {categoryLabel(group.category)}
                      </h2>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                        {group.items.length}
                      </span>
                    </div>
                    <ul className="divide-y divide-gray-50">
                      {group.items.map(item => (
                        <li key={item.id}>
                          <Link
                            to={`/topics/${item.id}`}
                            className="block px-5 py-4 hover:bg-emerald-50/40 transition-colors group"
                          >
                            <h3 className="font-medium text-gray-900 group-hover:text-emerald-700 group-hover:underline decoration-emerald-400 underline-offset-2 leading-snug">
                              {item.title}
                            </h3>
                            {item.excerpt && (
                              <p className="mt-1 text-sm text-gray-500 line-clamp-1 leading-relaxed">
                                {item.excerpt}
                              </p>
                            )}
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                              {item.author && <span>{item.author}</span>}
                              {item.createdAt && <span>{formatDate(item.createdAt)}</span>}
                              <span className="flex items-center gap-1">
                                <Eye className="w-3.5 h-3.5" />
                                {item.stats.views}
                              </span>
                              <span className="flex items-center gap-1">
                                <Heart className="w-3.5 h-3.5" />
                                {item.stats.likes}
                              </span>
                              {item.tags.map(tag => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 font-medium"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

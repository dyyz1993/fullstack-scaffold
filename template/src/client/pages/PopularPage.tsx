import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Flame, Eye, Heart, TrendingUp } from 'lucide-react'
import { LoadingSpinner } from '@client/components'
import { fetchPublicContents, type PublicContentItem } from '@client/services/publicContents'

const CATEGORY_LABELS: Record<string, string> = {
  announcement: '公告',
  article: '文章',
  tutorial: '教程',
  news: '新闻',
  policy: '政策',
}

function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category
}

/** 热度 = 点赞数 + 浏览数 */
function heatOf(item: PublicContentItem): number {
  return item.stats.likes + item.stats.views
}

/**
 * 热度排行视图：拉取公开内容后按热度（点赞 + 浏览）降序排列，显示排名与
 * 热度数值。数据来自公开内容 API，纯客户端本地排序。
 */
export const PopularPage: React.FC = () => {
  const [contents, setContents] = useState<PublicContentItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const items = await fetchPublicContents(20)
      setContents(items)
      setLoading(false)
    }
    load()
  }, [])

  const ranked = useMemo(() => [...contents].sort((a, b) => heatOf(b) - heatOf(a)), [contents])
  const maxHeat = useMemo(() => (ranked.length > 0 ? heatOf(ranked[0]) : 0), [ranked])

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-emerald-50/60 to-white"
      data-testid="popular-page"
    >
      <Helmet>
        <title>Popular - Community Forum</title>
        <meta name="description" content="Most popular community contents ranked by heat" />
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 pb-16">
        <div className="mb-8">
          <h1 className="flex items-center gap-2 text-3xl font-bold text-gray-900 tracking-tight">
            <TrendingUp className="w-7 h-7 text-emerald-600" />
            Popular
          </h1>
          <p className="mt-1 text-gray-500">按热度（点赞 + 浏览）排序的社区内容</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20" data-testid="popular-loading">
            <LoadingSpinner size="lg" color="text-emerald-500" />
          </div>
        ) : ranked.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <Flame className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Nothing popular yet</h3>
            <p className="text-gray-500 text-sm">Published contents will be ranked here</p>
          </div>
        ) : (
          <ol className="space-y-3">
            {ranked.map((item, index) => {
              const heat = heatOf(item)
              const isTop3 = index < 3
              return (
                <li key={item.id}>
                  <Link
                    to={`/topics/${item.id}`}
                    className="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-500/5 transition-all group"
                  >
                    <div
                      className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                        isTop3
                          ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm shadow-emerald-500/25'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                      data-testid={`popular-rank-${index + 1}`}
                    >
                      {index + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 group-hover:text-emerald-700 group-hover:underline decoration-emerald-400 underline-offset-2 leading-snug">
                        {item.title}
                      </h3>
                      {item.excerpt && (
                        <p className="mt-1 text-sm text-gray-500 line-clamp-1 leading-relaxed">
                          {item.excerpt}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 font-medium">
                          {categoryLabel(item.category)}
                        </span>
                        {item.author && <span>{item.author}</span>}
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          {item.stats.views}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-3.5 h-3.5" />
                          {item.stats.likes}
                        </span>
                      </div>
                    </div>

                    <div className="flex-shrink-0 flex flex-col items-end gap-1.5 min-w-[72px]">
                      <span
                        className={`flex items-center gap-1 text-sm font-bold ${
                          isTop3 ? 'text-emerald-600' : 'text-gray-500'
                        }`}
                        data-testid={`popular-heat-${index + 1}`}
                      >
                        <Flame className="w-4 h-4" />
                        {heat}
                      </span>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
                          style={{
                            width: maxHeat > 0 ? `${Math.max((heat / maxHeat) * 100, 4)}%` : '0%',
                          }}
                        />
                      </div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}

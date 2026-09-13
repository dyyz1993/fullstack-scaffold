/**
 * @framework-baseline ed1b510a4cf25ff9
 */

// 公开内容数据访问：/api/public/contents 的跨 preset 安全封装。
//
// 调用方（TopicsPage/PopularPage）会随模板复制到不含 content 模块的 preset
// （如 todo），其生成的 rpc-surface 没有 api.public 的完整 RPC 类型，因此
// 这里采用结构化窄类型访问 apiClient（与 DashboardPage 访问 api.admin 同款
// 模式），而不是依赖生成的 RPC 类型。响应统一映射为视图模型，供页面做
// 本地分组/排序。

import { apiClient } from '@client/services/apiClient'

/** 内容条目视图模型（由公开内容 API 响应映射而来，非 API 实体类型） */
export interface PublicContentItem {
  id: string
  title: string
  excerpt: string
  category: string
  author: string
  tags: string[]
  stats: { views: number; likes: number }
  createdAt: string
}

function toPublicContentItem(raw: unknown): PublicContentItem | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string' || typeof r.title !== 'string') return null
  return {
    id: r.id,
    title: r.title,
    excerpt: typeof r.content === 'string' ? r.content.slice(0, 160) : '',
    category: typeof r.category === 'string' && r.category.trim() ? r.category : 'other',
    author: typeof r.author === 'string' ? r.author : '',
    tags: Array.isArray(r.tags) ? r.tags.filter((t): t is string => typeof t === 'string') : [],
    stats: {
      views: typeof r.viewCount === 'number' ? r.viewCount : 0,
      likes: typeof r.likeCount === 'number' ? r.likeCount : 0,
    },
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : '',
  }
}

/** 拉取已发布内容列表（limit 默认 20），网络/响应异常由调用方兜底 */
export async function fetchPublicContents(limit = 20): Promise<PublicContentItem[]> {
  const api = apiClient.api as unknown as Record<
    string,
    Record<string, Record<string, (args?: unknown) => Promise<Response>>>
  >
  const contents = api?.public?.contents
  if (!contents?.$get) return []
  try {
    const res = await contents.$get({ query: { limit } })
    const result = (await res.json()) as {
      success?: boolean
      data?: { contents?: unknown[] }
    }
    if (!result.success || !Array.isArray(result.data?.contents)) return []
    return result.data.contents
      .map(toPublicContentItem)
      .filter((item): item is PublicContentItem => item !== null)
  } catch {
    return []
  }
}

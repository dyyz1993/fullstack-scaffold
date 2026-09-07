/**
 * Content module ISR routes (meta-only).
 * Registered into isrRegistry at import time.
 * Fetches data for SEO meta tags — body rendering handled by React SPA.
 */

import { isrRegistry, type ISRRouteEntry } from '@server/core/isr-registry'
import { getContents, getContentById } from './services/content-service'

interface ContentListData {
  contents: Array<{ id: string; title: string; category: string; author: string }>
  total: number
}

interface ContentDetailData {
  content: { id: string; title: string; content: string; author: string } | null
}

async function fetchContentList(): Promise<ContentListData> {
  const { contents, total } = await getContents({ limit: 20 })
  return { contents, total }
}

async function fetchContentDetail(pathname: string): Promise<ContentDetailData> {
  const id = pathname.replace('/content/', '')
  const content = await getContentById(id)
  return { content }
}

function contentListMeta(): { title: string; description: string } {
  return {
    title: '内容中心 - Biomimic App',
    description: 'Content management with categories and search',
  }
}

function contentDetailMeta(data: ContentDetailData): { title: string; description: string } {
  const c = data.content
  if (!c) {
    return { title: '内容不存在 - Biomimic App', description: '请求的内容不存在' }
  }
  return {
    title: `${c.title} - Biomimic App`,
    description: c.content?.substring(0, 160) || '内容详情',
  }
}

const contentEntries: ISRRouteEntry[] = [
  {
    module: 'content',
    match: '/content',
    fetch: () => fetchContentList(),
    meta: () => contentListMeta(),
  },
  {
    module: 'content',
    match: '/content/',
    fetch: pathname => fetchContentDetail(pathname),
    meta: data => contentDetailMeta(data as ContentDetailData),
  },
]

isrRegistry.registerMany(contentEntries)

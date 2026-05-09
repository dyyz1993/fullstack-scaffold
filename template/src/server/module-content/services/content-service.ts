import { eq, desc, and, like, or } from 'drizzle-orm'
import type {
  Content,
  CreateContentInput,
  UpdateContentInput,
  ContentCategory,
  ContentStatus,
} from '@shared/modules/content'
import { getDb } from '@server/db'
import { contents, type ContentTable } from '@server/db/schema'
import { toISOString } from '@server/utils/date'
import { randomDate, randomElement } from '@server/utils/generate'
import { parseModuleId } from '@server/utils/id-helpers'
// @framework-import ISR 缓存失效，内容变更时清除页面缓存
import { purgeContentPages } from '@server/core/isr-invalidation'

export async function seedContentsIfEmpty(): Promise<void> {
  const db = await getDb()
  const existing = await db.select().from(contents).all()
  if (existing.length === 0) {
    const CATEGORIES: ContentCategory[] = ['article', 'announcement', 'tutorial', 'news', 'policy']
    const STATUSES: ContentStatus[] = ['draft', 'published', 'archived']
    const TITLES = [
      '系统升级公告',
      '新功能发布说明',
      '用户使用指南',
      '常见问题解答',
      '隐私政策更新',
      '服务条款变更',
      '平台操作教程',
      '最佳实践分享',
    ]
    const AUTHORS = ['管理员', '运营团队', '技术团队', '客服团队']
    const TAGS_LIST = [
      JSON.stringify(['系统', '升级']),
      JSON.stringify(['功能', '新特性']),
      JSON.stringify(['教程', '帮助']),
      JSON.stringify(['FAQ', '常见问题']),
      JSON.stringify(['政策', '隐私']),
      JSON.stringify(['条款', '服务']),
      JSON.stringify(['教程', '操作']),
      JSON.stringify(['最佳实践', '经验']),
    ]

    for (let i = 0; i < 20; i++) {
      const category = randomElement(CATEGORIES)
      const status = randomElement(STATUSES)
      const createdAt = new Date(randomDate(new Date('2024-01-01'), new Date()))
      const isPublished = status === 'published'

      await db.insert(contents).values({
        title: TITLES[i % TITLES.length],
        body: `这是${TITLES[i % TITLES.length]}的详细内容。这里包含了完整的文章内容，用户可以阅读和学习相关知识。`,
        category,
        status,
        author: randomElement(AUTHORS),
        tags: TAGS_LIST[i % TAGS_LIST.length],
        viewCount: Math.floor(Math.random() * 1000),
        likeCount: Math.floor(Math.random() * 100),
        createdAt,
        updatedAt: new Date(randomDate(createdAt, new Date())),
        publishedAt: isPublished ? new Date(randomDate(createdAt, new Date())) : null,
      })
    }
  }
}

function mapContentRow(row: ContentTable): Content {
  return {
    id: `content-${row.id}`,
    title: row.title,
    content: row.body,
    category: row.category,
    status: row.status,
    author: row.author,
    tags: row.tags ? JSON.parse(row.tags) : [],
    viewCount: row.viewCount,
    likeCount: row.likeCount,
    createdAt: toISOString(row.createdAt),
    updatedAt: toISOString(row.updatedAt),
    publishedAt: row.publishedAt ? toISOString(row.publishedAt) : undefined,
  }
}

export async function getContents(filters?: {
  category?: ContentCategory
  status?: ContentStatus
  search?: string
}): Promise<Content[]> {
  const db = await getDb()
  const conditions = []

  if (filters?.category) {
    conditions.push(eq(contents.category, filters.category))
  }
  if (filters?.status) {
    conditions.push(eq(contents.status, filters.status))
  }
  if (filters?.search) {
    const term = `%${filters.search}%`
    conditions.push(
      or(like(contents.title, term), like(contents.body, term), like(contents.tags, term))!
    )
  }

  const rows =
    conditions.length > 0
      ? await db
          .select()
          .from(contents)
          .where(and(...conditions))
          .orderBy(desc(contents.createdAt))
      : await db.select().from(contents).orderBy(desc(contents.createdAt))

  return rows.map(mapContentRow)
}

export async function getContentById(id: string): Promise<Content | null> {
  const db = await getDb()
  const numId = parseModuleId('content', id)
  if (numId === -1) return null

  const rows = await db.select().from(contents).where(eq(contents.id, numId))
  const row = rows[0]
  if (!row) return null
  return mapContentRow(row)
}

export async function createContent(data: CreateContentInput): Promise<Content> {
  const db = await getDb()
  const now = new Date()
  const result = await db
    .insert(contents)
    .values({
      title: data.title,
      body: data.content,
      category: data.category,
      status: 'draft',
      author: '管理员',
      tags: data.tags ? JSON.stringify(data.tags) : null,
      viewCount: 0,
      likeCount: 0,
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  return mapContentRow(result[0])
}

export async function updateContent(id: string, data: UpdateContentInput): Promise<Content | null> {
  const db = await getDb()
  const numId = parseModuleId('content', id)
  if (numId === -1) return null

  const updateData: Partial<ContentTable> = {
    updatedAt: new Date(),
  }
  if (data.title !== undefined && data.title !== null) {
    updateData.title = data.title
  }
  if (data.content !== undefined && data.content !== null) {
    updateData.body = data.content
  }
  if (data.category !== undefined && data.category !== null) {
    updateData.category = data.category
  }
  if (data.tags !== undefined && data.tags !== null) {
    updateData.tags = JSON.stringify(data.tags)
  }
  if (data.status !== undefined && data.status !== null) {
    updateData.status = data.status
  }

  const result = await db.update(contents).set(updateData).where(eq(contents.id, numId)).returning()

  if (result.length === 0) return null
  purgeContentPages().catch(() => {})
  return mapContentRow(result[0])
}

export async function deleteContent(id: string): Promise<{ success: boolean; message: string }> {
  const db = await getDb()
  const numId = parseModuleId('content', id)
  if (numId === -1) return { success: false, message: '内容不存在' }

  const result = await db.delete(contents).where(eq(contents.id, numId)).returning()
  if (result.length === 0) return { success: false, message: '内容不存在' }
  purgeContentPages().catch(() => {})
  return { success: true, message: '内容已删除' }
}

export async function publishContent(id: string): Promise<Content | null> {
  const db = await getDb()
  const numId = parseModuleId('content', id)
  if (numId === -1) return null

  const rows = await db.select().from(contents).where(eq(contents.id, numId))
  const content = rows[0]
  if (!content || content.status !== 'draft') return null

  const now = new Date()
  const result = await db
    .update(contents)
    .set({ status: 'published', publishedAt: now, updatedAt: now })
    .where(eq(contents.id, numId))
    .returning()

  purgeContentPages().catch(() => {})
  return mapContentRow(result[0])
}

export async function archiveContent(id: string): Promise<Content | null> {
  const db = await getDb()
  const numId = parseModuleId('content', id)
  if (numId === -1) return null

  const rows = await db.select().from(contents).where(eq(contents.id, numId))
  const content = rows[0]
  if (!content || content.status !== 'published') return null

  const result = await db
    .update(contents)
    .set({ status: 'archived', updatedAt: new Date() })
    .where(eq(contents.id, numId))
    .returning()

  purgeContentPages().catch(() => {})
  return mapContentRow(result[0])
}

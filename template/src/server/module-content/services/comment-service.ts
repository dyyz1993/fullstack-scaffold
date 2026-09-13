import { eq, and, asc } from 'drizzle-orm'
import type {
  ContentComment,
  ContentCommentListQuery,
  ContentCommentListResponse,
  CreateContentCommentInput,
} from '@shared/modules/content'
import { getDb } from '@server/db'
import { contents, contentComments, type ContentCommentTable } from '@server/db/schema'
import { toISOString } from '@server/utils/date'
import { parseModuleId } from '@server/utils/id-helpers'

function mapCommentRow(row: ContentCommentTable): ContentComment {
  return {
    id: `comment-${row.id}`,
    contentId: `content-${row.contentId}`,
    userId: row.userId,
    userName: row.userName,
    body: row.body,
    createdAt: toISOString(row.createdAt),
  }
}

export async function getComments(
  contentId: string,
  query: ContentCommentListQuery = { page: 1, limit: 20 }
): Promise<ContentCommentListResponse> {
  const db = await getDb()
  const numId = parseModuleId('content', contentId)
  if (numId === -1) return { comments: [], total: 0, page: query.page, limit: query.limit }

  const total = await db.$count(contentComments, eq(contentComments.contentId, numId))
  const rows = await db
    .select()
    .from(contentComments)
    .where(eq(contentComments.contentId, numId))
    .orderBy(asc(contentComments.createdAt))
    .limit(query.limit)
    .offset((query.page - 1) * query.limit)

  return {
    comments: rows.map(mapCommentRow),
    total,
    page: query.page,
    limit: query.limit,
  }
}

export async function getComment(
  contentId: string,
  commentId: string
): Promise<ContentComment | null> {
  const db = await getDb()
  const numId = parseModuleId('content', contentId)
  const numCommentId = parseModuleId('comment', commentId)
  if (numId === -1 || numCommentId === -1) return null

  const rows = await db
    .select()
    .from(contentComments)
    .where(and(eq(contentComments.id, numCommentId), eq(contentComments.contentId, numId)))
    .limit(1)
  return rows[0] ? mapCommentRow(rows[0]) : null
}

export async function createComment(
  contentId: string,
  author: { userId: string; userName: string },
  data: CreateContentCommentInput
): Promise<ContentComment | null> {
  const db = await getDb()
  const numId = parseModuleId('content', contentId)
  if (numId === -1) return null

  const targetCount = await db.$count(contents, eq(contents.id, numId))
  if (targetCount === 0) return null

  const result = await db
    .insert(contentComments)
    .values({
      contentId: numId,
      userId: author.userId,
      userName: author.userName,
      body: data.body,
      // 显式提供：绕开 DB 毫秒默认与 drizzle 秒语义的不一致
      createdAt: new Date(),
    })
    .returning()

  return mapCommentRow(result[0])
}

export async function deleteComment(commentId: string): Promise<boolean> {
  const db = await getDb()
  const numCommentId = parseModuleId('comment', commentId)
  if (numCommentId === -1) return false

  const result = await db
    .delete(contentComments)
    .where(eq(contentComments.id, numCommentId))
    .returning()
  return result.length > 0
}

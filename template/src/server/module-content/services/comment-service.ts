import { eq, asc } from 'drizzle-orm'
import type { ContentComment, CreateContentCommentInput } from '@shared/modules/content'
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

export async function getComments(contentId: string): Promise<ContentComment[]> {
  const db = await getDb()
  const numId = parseModuleId('content', contentId)
  if (numId === -1) return []

  const rows = await db
    .select()
    .from(contentComments)
    .where(eq(contentComments.contentId, numId))
    .orderBy(asc(contentComments.createdAt))
  return rows.map(mapCommentRow)
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

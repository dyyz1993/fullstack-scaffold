import { z } from '@hono/zod-openapi'

export const ContentCategorySchema = z.enum([
  'article',
  'announcement',
  'tutorial',
  'news',
  'policy',
])
export const ContentStatusSchema = z.enum(['draft', 'published', 'archived'])

export const ContentSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  category: ContentCategorySchema,
  status: ContentStatusSchema,
  author: z.string(),
  tags: z.array(z.string()),
  viewCount: z.number(),
  likeCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  publishedAt: z.string().nullish(),
})

export const CreateContentSchema = z.object({
  // trim 后 min(1)：拒绝纯空格标题入库（P2：admin 内容管理实测缺陷）
  title: z.string().trim().min(1),
  content: z.string().min(1),
  category: ContentCategorySchema,
  tags: z.array(z.string()).nullish(),
})

export const UpdateContentSchema = z.object({
  title: z.string().trim().min(1).nullish(),
  content: z.string().min(1).nullish(),
  category: ContentCategorySchema.nullish(),
  tags: z.array(z.string()).nullish(),
  status: ContentStatusSchema.nullish(),
})

export const ContentListSchema = z.array(ContentSchema)

export const ContentListResponseSchema = z.object({
  contents: z.array(ContentSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
})

export const ContentListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export const ContentDeleteResultSchema = z.object({
  message: z.string(),
})

export const ContentCommentSchema = z.object({
  id: z.string(),
  contentId: z.string(),
  userId: z.string(),
  userName: z.string(),
  body: z.string(),
  createdAt: z.string(),
})

export const CreateContentCommentSchema = z.object({
  body: z.string().min(1).max(2000),
})

export const ContentCommentListSchema = z.array(ContentCommentSchema)

export const ContentCommentListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export const ContentCommentListResponseSchema = z.object({
  comments: ContentCommentListSchema,
  total: z.number(),
  page: z.number(),
  limit: z.number(),
})

export type ContentComment = z.infer<typeof ContentCommentSchema>
export type CreateContentCommentInput = z.infer<typeof CreateContentCommentSchema>
export type ContentCommentListQuery = z.infer<typeof ContentCommentListQuerySchema>
export type ContentCommentListResponse = z.infer<typeof ContentCommentListResponseSchema>

export type ContentCategory = z.infer<typeof ContentCategorySchema>
export type ContentStatus = z.infer<typeof ContentStatusSchema>
export type Content = z.infer<typeof ContentSchema>
export type CreateContentInput = z.infer<typeof CreateContentSchema>
export type UpdateContentInput = z.infer<typeof UpdateContentSchema>
export type ContentListResponse = z.infer<typeof ContentListResponseSchema>
export type ContentListQuery = z.infer<typeof ContentListQuerySchema>
export type ContentDeleteResult = z.infer<typeof ContentDeleteResultSchema>

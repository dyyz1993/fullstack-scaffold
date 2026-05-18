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
  title: z.string(),
  content: z.string(),
  category: ContentCategorySchema,
  tags: z.array(z.string()).nullish(),
})

export const UpdateContentSchema = z.object({
  title: z.string().nullish(),
  content: z.string().nullish(),
  category: ContentCategorySchema.nullish(),
  tags: z.array(z.string()).nullish(),
  status: ContentStatusSchema.nullish(),
})

export const ContentListSchema = z.array(ContentSchema)

export const ContentDeleteResultSchema = z.object({
  message: z.string(),
})

export type ContentCategory = z.infer<typeof ContentCategorySchema>
export type ContentStatus = z.infer<typeof ContentStatusSchema>
export type Content = z.infer<typeof ContentSchema>
export type CreateContentInput = z.infer<typeof CreateContentSchema>
export type UpdateContentInput = z.infer<typeof UpdateContentSchema>
export type ContentDeleteResult = z.infer<typeof ContentDeleteResultSchema>

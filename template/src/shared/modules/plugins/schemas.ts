import { z } from '@hono/zod-openapi'

export const PluginStatusSchema = z.enum(['pending', 'approved', 'rejected'])

export const PluginSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200),
  description: z.string().max(2000),
  readme: z.string().nullish(),
  authorId: z.string(),
  authorName: z.string(),
  repositoryUrl: z.string().url().nullish(),
  homepageUrl: z.string().url().nullish(),
  npmPackage: z.string().nullish(),
  license: z.string().nullish(),
  version: z.string(),
  status: PluginStatusSchema,
  downloadCount: z.number().int().nonnegative().default(0),
  viewCount: z.number().int().nonnegative().default(0),
  featured: z.boolean().default(false),
  screenshotUrl: z.string().nullish(),
  siteUrls: z.array(z.string().url()).nullish(),
  tags: z.array(z.string()).nullish(),
  commands: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().nullish(),
      })
    )
    .nullish(),
  rejectReason: z.string().nullish(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export const CreatePluginSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().min(1).max(2000),
  repositoryUrl: z.string().url().nullish(),
  homepageUrl: z.string().url().nullish(),
  npmPackage: z.string().nullish(),
  license: z.string().nullish(),
  tags: z.array(z.string()).nullish(),
  siteUrls: z.array(z.string().url()).nullish(),
  commands: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().nullish(),
      })
    )
    .nullish(),
})

export const UpdatePluginSchema = CreatePluginSchema.partial()

export const PluginVersionStatusSchema = z.enum(['pending', 'approved', 'rejected'])

export const VersionSchema = z.object({
  id: z.string(),
  pluginId: z.string(),
  version: z.string(),
  changelog: z.string().nullish(),
  packageUrl: z.string().nullish(),
  fileSize: z.number().nullish(),
  checksum: z.string().nullish(),
  status: PluginVersionStatusSchema,
  publishedAt: z.number(),
})

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullish(),
  icon: z.string().nullish(),
  sortOrder: z.number().int().default(0),
})

export const ReviewSchema = z.object({
  id: z.string(),
  pluginId: z.string(),
  userId: z.string(),
  userName: z.string(),
  rating: z.number().int().min(1).max(5),
  title: z.string().nullish(),
  content: z.string().nullish(),
  createdAt: z.number(),
})

export const CreateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).nullish(),
  content: z.string().max(2000).nullish(),
})

export const MarketplaceStatsSchema = z.object({
  totalPlugins: z.number(),
  totalDownloads: z.number(),
  totalDevelopers: z.number(),
  totalCategories: z.number(),
})

export const PluginListResponseSchema = z.object({
  plugins: z.array(PluginSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
})

export const AdminPluginSchema = PluginSchema.extend({
  avgRating: z.number().nullish(),
  reviewCount: z.number().nullish(),
})

export const AdminDashboardStatsSchema = z.object({
  totalPlugins: z.number(),
  pendingPlugins: z.number(),
  totalDownloads: z.number(),
  totalDevelopers: z.number(),
  totalCategories: z.number(),
  recentSubmissions: z.array(AdminPluginSchema).nullish(),
})

export const PluginListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().nullish(),
  status: PluginStatusSchema.nullish(),
  category: z.string().nullish(),
  sort: z.enum(['newest', 'popular', 'downloads', 'name']).default('newest'),
  featured: z.coerce.boolean().nullish(),
})

export const PluginSlugSchema = z.object({
  slug: z.string().min(1),
})

export const PluginSearchQuerySchema = z.object({
  q: z.string().min(1),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  category: z.string().nullish(),
})

export const PluginDeleteResponseSchema = z.object({ slug: z.string() })

export const ReviewIdParamsSchema = z.object({ slug: z.string(), reviewId: z.string() })

export const ReviewDeleteResponseSchema = z.object({ id: z.string() })

export const CategorySlugParamsSchema = z.object({ slug: z.string() })

export const CategoryPluginsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export const PluginListAdminSchema = z.object({
  plugins: z.array(PluginSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
})

export const AdminListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export const AdminListAllQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: PluginStatusSchema.nullish(),
})

export const RejectPluginBodySchema = z.object({ reason: z.string().min(1) })

export const BulkApproveBodySchema = z.object({ slugs: z.array(z.string()).min(1) })

export const BulkRejectBodySchema = z.object({
  slugs: z.array(z.string()).min(1),
  reason: z.string().min(1),
})

export const BulkResponseSchema = z.object({ count: z.number() })

export const CreateCategoryBodySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullish(),
  icon: z.string().nullish(),
})

export const UpdateCategoryBodySchema = z.object({
  name: z.string().nullish(),
  slug: z.string().nullish(),
  description: z.string().nullish(),
  icon: z.string().nullish(),
  sortOrder: z.number().int().nullish(),
})

export const CategoryIdParamsSchema = z.object({ id: z.string() })

export const CategoryIdResponseSchema = z.object({ id: z.string() })

export type Plugin = z.infer<typeof PluginSchema>
export type PluginStatus = z.infer<typeof PluginStatusSchema>
export type CreatePluginInput = z.infer<typeof CreatePluginSchema>
export type UpdatePluginInput = z.infer<typeof UpdatePluginSchema>
export type PluginVersionStatus = z.infer<typeof PluginVersionStatusSchema>
export type Version = z.infer<typeof VersionSchema>
export type Category = z.infer<typeof CategorySchema>
export type Review = z.infer<typeof ReviewSchema>
export type CreateReviewInput = z.infer<typeof CreateReviewSchema>
export type MarketplaceStats = z.infer<typeof MarketplaceStatsSchema>
export type PluginListResponse = z.infer<typeof PluginListResponseSchema>
export type AdminPlugin = z.infer<typeof AdminPluginSchema>
export type AdminDashboardStats = z.infer<typeof AdminDashboardStatsSchema>
export type PluginListQuery = z.infer<typeof PluginListQuerySchema>

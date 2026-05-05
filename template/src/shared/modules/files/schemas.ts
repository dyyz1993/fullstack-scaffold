import { z } from '@hono/zod-openapi'

export const FileDownloadSchema = z.object({
  namespace: z.string(),
  filename: z.string(),
})

export const PrivateFileQuerySchema = z.object({
  expiry: z.string().transform(Number),
  signature: z.string(),
})

export const PublicFileUrlSchema = z.object({
  url: z.string(),
})

export const PrivateFileUrlSchema = z.object({
  url: z.string(),
  expiry: z.number(),
})

export const GenerateUrlRequestSchema = z.object({
  namespace: z.string(),
  filename: z.string(),
  isPrivate: z.boolean().nullish().default(false),
  expirySeconds: z.number().nullish(),
})

export const FileUrlResponseSchema = z.union([PublicFileUrlSchema, PrivateFileUrlSchema])

export const EmptySchema = z.object({})

export const UploadResultSchema = z.object({
  filename: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number(),
  url: z.string(),
})

export const UploadFileBodySchema = z.object({
  file: z.instanceof(File),
  namespace: z.string().nullish().default('uploads'),
})

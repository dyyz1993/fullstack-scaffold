import { z } from '@hono/zod-openapi'

export const FileDownloadSchema = z.object({
  namespace: z.string(),
  filename: z.string(),
})

export const PrivateFileQuerySchema = z.object({
  expiry: z.string().transform(Number),
  signature: z.string(),
})

export const GenerateUrlRequestSchema = z.object({
  namespace: z.string(),
  filename: z.string(),
  isPrivate: z.boolean().nullish().default(false),
  expirySeconds: z.number().int().min(60).max(86400).nullish(),
})

export const FileUrlResponseSchema = z.object({
  url: z.string(),
  expiry: z.number().nullish(),
})

export type FileDownload = z.infer<typeof FileDownloadSchema>
export type PrivateFileQuery = z.infer<typeof PrivateFileQuerySchema>
export type GenerateUrlRequest = z.infer<typeof GenerateUrlRequestSchema>
export type FileUrlResponse = z.infer<typeof FileUrlResponseSchema>

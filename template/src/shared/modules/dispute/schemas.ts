import { z } from '@hono/zod-openapi'

export const DisputeTypeSchema = z.enum([
  'refund',
  'product_quality',
  'service_quality',
  'delivery',
  'other',
])
export const DisputeStatusSchema = z.enum(['pending', 'investigating', 'resolved', 'rejected'])

export const DisputeSchema = z.object({
  id: z.string(),
  disputeNo: z.string(),
  orderId: z.string(),
  orderNo: z.string(),
  customerName: z.string(),
  customerEmail: z.string(),
  type: DisputeTypeSchema,
  status: DisputeStatusSchema,
  description: z.string(),
  resolution: z.string().nullish(),
  amount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  resolvedAt: z.string().nullish(),
  resolvedBy: z.string().nullish(),
})

export const CreateDisputeSchema = z.object({
  orderId: z.string(),
  orderNo: z.string(),
  customerName: z.string(),
  customerEmail: z.string().email(),
  type: DisputeTypeSchema,
  description: z.string(),
  amount: z.number().positive(),
})

export const UpdateDisputeSchema = z.object({
  status: DisputeStatusSchema.nullish(),
  resolution: z.string().nullish(),
})

export const ResolveDisputeSchema = z.object({
  resolution: z.string(),
  resolvedBy: z.string(),
})

export const DisputeListSchema = z.array(DisputeSchema)

export const DisputeListResponseSchema = z.object({
  disputes: z.array(DisputeSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
})

export const DisputeListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export const DisputeDeleteResultSchema = z.object({
  message: z.string(),
})

export type DisputeType = z.infer<typeof DisputeTypeSchema>
export type DisputeStatus = z.infer<typeof DisputeStatusSchema>
export type Dispute = z.infer<typeof DisputeSchema>
export type CreateDisputeInput = z.infer<typeof CreateDisputeSchema>
export type UpdateDisputeInput = z.infer<typeof UpdateDisputeSchema>
export type ResolveDisputeInput = z.infer<typeof ResolveDisputeSchema>
export type DisputeListResponse = z.infer<typeof DisputeListResponseSchema>
export type DisputeListQuery = z.infer<typeof DisputeListQuerySchema>
export type DisputeDeleteResult = z.infer<typeof DisputeDeleteResultSchema>

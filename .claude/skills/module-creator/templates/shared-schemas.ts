// template/src/shared/modules/{name}/schemas.ts
import { z } from '@hono/zod-openapi'

// === Entity Schema ===

export const {Name}Schema = z.object({
  id: z.number().int().positive(),
  // Add fields based on requirements, e.g.:
  // name: z.string().min(1).max(200),
  // status: z.enum(['active', 'inactive']).default('active'),
  // description: z.string().max(1000).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type {Name} = z.infer<typeof {Name}Schema>

// === Input Schemas ===

export const Create{Name}Schema = {Name}Schema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export type Create{Name}Input = z.infer<typeof Create{Name}Schema>

export const Update{Name}Schema = Create{Name}Schema.partial()

export type Update{Name}Input = z.infer<typeof Update{name}Schema>

// === Query Schemas (optional) ===

export const List{name}QuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  // Add filters, e.g.:
  // status: z.enum(['active', 'inactive']).optional(),
  // search: z.string().optional(),
})

export type List{name}Query = z.infer<typeof List{name}QuerySchema>

/**
 * Todo module schemas
 * Each module has its own schema file for better organization
 */

import { z } from 'zod'

export const TodoStatusSchema = z.enum(['pending', 'in_progress', 'completed'])

export const TodoSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  status: TodoStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const CreateTodoSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
})

export const UpdateTodoSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
  description: z.string().max(1000, 'Description too long').optional(),
  status: TodoStatusSchema.optional(),
})

export const TodoIdSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export type TodoStatus = z.infer<typeof TodoStatusSchema>
export type Todo = z.infer<typeof TodoSchema>
export type CreateTodoInput = z.infer<typeof CreateTodoSchema>
export type UpdateTodoInput = z.infer<typeof UpdateTodoSchema>

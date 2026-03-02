/**
 * Zod validation schemas for Todo application
 * Single source of truth for all types and validation
 *
 * Usage:
 * - Server: Import schemas for route validation
 * - Client: Import schemas for form validation
 * - Types: Use z.infer to derive TypeScript types
 */

import { z } from 'zod';

export const TodoStatusSchema = z.enum(['pending', 'in_progress', 'completed']);

export const TodoSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  status: TodoStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateTodoSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
});

export const UpdateTodoSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
  description: z.string().max(1000, 'Description too long').optional(),
  status: TodoStatusSchema.optional(),
});

export const TodoIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const ApiSuccessSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
  });

export const ApiErrorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
});

export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.union([ApiSuccessSchema(dataSchema), ApiErrorSchema]);

export type TodoStatus = z.infer<typeof TodoStatusSchema>;
export type Todo = z.infer<typeof TodoSchema>;
export type CreateTodoInput = z.infer<typeof CreateTodoSchema>;
export type UpdateTodoInput = z.infer<typeof UpdateTodoSchema>;
export type ApiSuccess<T> = { success: true; data: T };
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

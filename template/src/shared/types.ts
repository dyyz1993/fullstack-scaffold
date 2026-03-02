/**
 * Shared types for Todo application
 * Re-exports types from schemas.ts for backward compatibility
 *
 * Recommended: Import directly from '@shared/schemas' for both types and validation
 * This file exists for convenience and backward compatibility
 */

export type {
  TodoStatus,
  Todo,
  CreateTodoInput,
  UpdateTodoInput,
  ApiSuccess,
  ApiError,
  ApiResponse,
} from './schemas';

// Re-export schemas for convenience (useful for form validation on client)
export {
  TodoStatusSchema,
  TodoSchema,
  CreateTodoSchema,
  UpdateTodoSchema,
  TodoIdSchema,
  ApiSuccessSchema,
  ApiErrorSchema,
  ApiResponseSchema,
} from './schemas';

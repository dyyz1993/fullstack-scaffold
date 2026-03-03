/**
 * API Helper functions
 * Convenience functions for common API operations
 */

import { apiClient, isSuccess, isError, getErrorMessage } from '@client/services/apiClient';
import type { ApiSuccess, ApiError } from '@shared/schemas';
import type { Todo } from '@shared/types';

/**
 * Fetch all todos from the API
 * @returns Promise that resolves to an array of todos
 * @throws Error if the request fails
 */
export async function fetchTodos(): Promise<Todo[]> {
  try {
    const response = await apiClient.api.todos.$get();
    const result = await response.json();

    if (isSuccess<Todo[]>(result)) {
      return result.data;
    }

    if (isError(result)) {
      throw new Error(result.error);
    }

    throw new Error('Unexpected response format');
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch todos');
  }
}

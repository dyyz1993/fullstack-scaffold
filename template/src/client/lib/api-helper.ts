import type { ApiResponse, Todo } from '@shared/schemas';

const API_BASE_URL = import.meta.env.API_BASE_URL || window.location.origin;

export async function fetchTodos(): Promise<ApiResponse<Todo[]>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/todos`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP error! status: ${response.status}`,
      };
    }

    const result: ApiResponse<Todo[]> = await response.json();
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

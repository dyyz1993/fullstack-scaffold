import { apiClient } from '@client/services/apiClient';

export interface ApiTodo {
  id: number;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
  updatedAt: string;
  description?: string;
}

export async function fetchTodos(): Promise<ApiTodo[]> {
  const response = await apiClient.api.todos.$get();
  const result = await response.json();

  if (!result.success) {
    throw new Error('Failed to fetch todos');
  }

  return result.data;
}

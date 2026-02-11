/**
 * Shared types for Todo application
 * Used by both client and server
 */

export type TodoStatus = 'pending' | 'in_progress' | 'completed';

export interface Todo {
  id: number;
  title: string;
  description?: string;
  status: TodoStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTodoInput {
  title: string;
  description?: string;
}

export interface UpdateTodoInput {
  title?: string;
  description?: string;
  status?: TodoStatus;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

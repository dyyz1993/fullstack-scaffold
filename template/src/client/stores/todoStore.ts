import { create } from 'zustand'
import { apiClient } from '@client/services/apiClient'
import type { Todo, CreateTodoInput, UpdateTodoInput } from '@shared/types'

interface TodoState {
  todos: Todo[]
  loading: boolean
  error: string | null

  fetchTodos: () => Promise<void>
  createTodo: (input: CreateTodoInput) => Promise<void>
  updateTodo: (id: number, input: UpdateTodoInput) => Promise<void>
  deleteTodo: (id: number) => Promise<void>
  setError: (error: string | null) => void
}

export const useTodoStore = create<TodoState>(set => ({
  todos: [],
  loading: false,
  error: null,

  fetchTodos: async () => {
    set({ loading: true, error: null })
    try {
      const response = await apiClient.api.todos.$get()
      const result = await response.json()
      if (result.success) {
        set({ todos: result.data, loading: false })
      } else {
        set({ error: result.error, loading: false })
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false,
      })
    }
  },

  createTodo: async (input: CreateTodoInput) => {
    set({ loading: true, error: null })
    try {
      const response = await apiClient.api.todos.$post({
        json: input,
      })
      const result = await response.json()
      if (result.success) {
        set(state => ({
          todos: [...state.todos, result.data],
          loading: false,
        }))
      } else {
        set({ error: result.error, loading: false })
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false,
      })
    }
  },

  updateTodo: async (id: number, input: UpdateTodoInput) => {
    set({ loading: true, error: null })
    try {
      const response = await apiClient.api.todos[':id'].$put({
        param: { id: id.toString() },
        json: input,
      })
      const result = await response.json()
      if (result.success) {
        set(state => ({
          todos: state.todos.map(todo => (todo.id === id ? result.data : todo)),
          loading: false,
        }))
      } else {
        set({ error: result.error, loading: false })
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false,
      })
    }
  },

  deleteTodo: async (id: number) => {
    set({ loading: true, error: null })
    try {
      const response = await apiClient.api.todos[':id'].$delete({
        param: { id: id.toString() },
      })
      const result = await response.json()
      if (result.success) {
        set(state => ({
          todos: state.todos.filter(todo => todo.id !== id),
          loading: false,
        }))
      } else {
        set({ error: result.error, loading: false })
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false,
      })
    }
  },

  setError: (error: string | null) => {
    set({ error })
  },
}))

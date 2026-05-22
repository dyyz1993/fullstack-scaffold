// template/src/client/stores/{name}Store.ts
import { create } from 'zustand'
import { apiClient } from '@client/services/apiClient'
import type { {Name}, Create{Name}Input } from '@shared/schemas'

interface {Name}State {
  items: {Name}[]
  loading: boolean
  error: string | null

  fetchItems: () => Promise<void>
  createItem: (input: Create{Name}Input) => Promise<void>
  updateItem: (id: number, input: Partial<Create{Name}Input>) => Promise<void>
  deleteItem: (id: number) => Promise<void>
  clearError: () => void
}

export const use{Name}Store = create<{Name}State>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetchItems: async () => {
    set({ loading: true, error: null })
    try {
      const response = await apiClient.api.{names}.$get()
      const result = await response.json()
      if (result.success) {
        set({ items: result.data, loading: false })
      } else {
        set({ error: result.error, loading: false })
      }
    } catch (error) {
      set({ error: 'Failed to fetch {names}', loading: false })
    }
  },

  createItem: async (input: Create{Name}Input) => {
    set({ loading: true, error: null })
    try {
      const response = await apiClient.api.{names}.$post({ json: input })
      const result = await response.json()
      if (result.success) {
        set(state => ({ items: [...state.items, result.data], loading: false }))
      } else {
        set({ error: result.error, loading: false })
      }
    } catch (error) {
      set({ error: 'Failed to create {name}', loading: false })
    }
  },

  updateItem: async (id: number, input: Partial<Create{Name}Input>) => {
    try {
      const response = await apiClient.api.{names}[':id'].$put({
        param: { id: String(id) },
        json: input,
      })
      const result = await response.json()
      if (result.success) {
        set(state => ({
          items: state.items.map(item => item.id === id ? result.data : item),
        }))
      }
    } catch (error) {
      set({ error: 'Failed to update {name}' })
    }
  },

  deleteItem: async (id: number) => {
    try {
      const response = await apiClient.api.{names}[':id'].$delete({
        param: { id: String(id) },
      })
      const result = await response.json()
      if (result.success) {
        set(state => ({ items: state.items.filter(item => item.id !== id) }))
      }
    } catch (error) {
      set({ error: 'Failed to delete {name}' })
    }
  },

  clearError: () => set({ error: null }),
}))

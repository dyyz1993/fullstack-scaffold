import { create } from 'zustand'
import { apiClient } from '@client/services/apiClient'
import type {
  Plugin,
  Category,
  Review,
  MarketplaceStats,
  CreatePluginInput,
  CreateReviewInput,
  PluginListResponse,
} from '@shared/schemas'

type Pagination = Pick<PluginListResponse, 'page' | 'limit' | 'total'>

interface PluginState {
  plugins: Plugin[]
  currentPlugin: Plugin | null
  reviews: Review[]
  myPlugins: Plugin[]
  categories: Category[]
  stats: MarketplaceStats | null
  searchQuery: string
  selectedCategory: string | null
  loading: boolean
  error: string | null
  pagination: Pagination

  fetchPlugins: (page?: number) => Promise<void>
  fetchPlugin: (slug: string) => Promise<void>
  fetchReviews: (slug: string) => Promise<void>
  searchPlugins: (query: string, page?: number) => Promise<void>
  fetchCategories: () => Promise<void>
  fetchStats: () => Promise<void>
  fetchMyPlugins: () => Promise<void>
  createPlugin: (data: CreatePluginInput) => Promise<string | null>
  deletePlugin: (slug: string) => Promise<void>
  submitReview: (slug: string, data: CreateReviewInput) => Promise<void>
  trackInstall: (slug: string) => Promise<void>
  setSearchQuery: (query: string) => void
  setSelectedCategory: (category: string | null) => void
  clearError: () => void
  clearCurrentPlugin: () => void
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Unknown error'
}

export const usePluginStore = create<PluginState>((set, get) => ({
  plugins: [],
  currentPlugin: null,
  reviews: [],
  myPlugins: [],
  categories: [],
  stats: null,
  searchQuery: '',
  selectedCategory: null,
  loading: false,
  error: null,
  pagination: { page: 1, limit: 20, total: 0 },

  fetchPlugins: async (page = 1) => {
    set({ loading: true, error: null })
    try {
      const { selectedCategory } = get()
      const query: Record<string, string | number | boolean | undefined> = {
        page,
        limit: 20,
        sort: 'newest',
      }
      if (selectedCategory) query.category = selectedCategory

      const response = await apiClient.api.plugins.$get({ query })
      const result = await response.json()
      if (result.success) {
        set({
          plugins: result.data.plugins,
          pagination: {
            page: result.data.page,
            limit: result.data.limit,
            total: result.data.total,
          },
          loading: false,
        })
      } else {
        set({
          loading: false,
          error: (result as { error?: string }).error ?? 'Failed to fetch plugins',
        })
      }
    } catch (error) {
      set({ error: getErrorMessage(error), loading: false })
    }
  },

  fetchPlugin: async (slug: string) => {
    set({ loading: true, error: null, currentPlugin: null })
    try {
      const response = await apiClient.api.plugins[':slug'].$get({ param: { slug } })
      const result = await response.json()
      if (result.success) {
        set({ currentPlugin: result.data, loading: false })
      } else {
        set({ loading: false, error: (result as { error?: string }).error ?? 'Plugin not found' })
      }
    } catch (error) {
      set({ error: getErrorMessage(error), loading: false })
    }
  },

  fetchReviews: async (slug: string) => {
    try {
      const response = await apiClient.api.plugins[':slug'].reviews.$get({ param: { slug } })
      const result = await response.json()
      if (result.success) {
        set({ reviews: result.data })
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error)
    }
  },

  searchPlugins: async (query: string, page = 1) => {
    set({ loading: true, error: null })
    try {
      const { selectedCategory } = get()

      const response = await apiClient.api.plugins.search.$get({
        query: {
          q: query,
          page,
          limit: 20,
          ...(selectedCategory ? { category: selectedCategory } : {}),
        },
      })
      const result = await response.json()
      if (result.success) {
        set({
          plugins: result.data.plugins,
          pagination: {
            page: result.data.page,
            limit: result.data.limit,
            total: result.data.total,
          },
          loading: false,
        })
      } else {
        set({ loading: false, error: (result as { error?: string }).error ?? 'Search failed' })
      }
    } catch (error) {
      set({ error: getErrorMessage(error), loading: false })
    }
  },

  fetchCategories: async () => {
    try {
      const response = await apiClient.api.categories.$get()
      const result = await response.json()
      if (result.success) {
        set({ categories: result.data })
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  },

  fetchStats: async () => {
    try {
      const response = await apiClient.api.stats.$get()
      const result = await response.json()
      if (result.success) {
        set({ stats: result.data })
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  },

  fetchMyPlugins: async () => {
    set({ loading: true, error: null })
    try {
      const response = await apiClient.api.plugins.mine.$get()
      const result = await response.json()
      if (result.success) {
        set({ myPlugins: result.data, loading: false })
      } else {
        set({
          loading: false,
          error: (result as { error?: string }).error ?? 'Failed to fetch your plugins',
        })
      }
    } catch (error) {
      set({ error: getErrorMessage(error), loading: false })
    }
  },

  createPlugin: async (data: CreatePluginInput): Promise<string | null> => {
    set({ loading: true, error: null })
    try {
      const response = await apiClient.api.plugins.$post({ json: data })
      const result = await response.json()
      if (result.success) {
        set(state => ({
          myPlugins: [result.data, ...state.myPlugins],
          loading: false,
        }))
        return result.data.slug
      }
      set({
        loading: false,
        error: (result as { error?: string }).error ?? 'Failed to create plugin',
      })
      return null
    } catch (error) {
      set({ error: getErrorMessage(error), loading: false })
      return null
    }
  },

  deletePlugin: async (slug: string) => {
    set({ loading: true, error: null })
    try {
      const response = await apiClient.api.plugins[':slug'].$delete({ param: { slug } })
      const result = await response.json()
      if (result.success) {
        set(state => ({
          myPlugins: state.myPlugins.filter(p => p.slug !== slug),
          plugins: state.plugins.filter(p => p.slug !== slug),
          loading: false,
        }))
      } else {
        set({
          loading: false,
          error: (result as { error?: string }).error ?? 'Failed to delete plugin',
        })
      }
    } catch (error) {
      set({ error: getErrorMessage(error), loading: false })
    }
  },

  submitReview: async (slug: string, data: CreateReviewInput) => {
    set({ loading: true, error: null })
    try {
      const response = await apiClient.api.plugins[':slug'].reviews.$post({
        param: { slug },
        json: data,
      })
      const result = await response.json()
      if (result.success) {
        set(state => ({
          reviews: [result.data, ...state.reviews],
          loading: false,
        }))
      } else {
        set({
          loading: false,
          error: (result as { error?: string }).error ?? 'Failed to submit review',
        })
      }
    } catch (error) {
      set({ error: getErrorMessage(error), loading: false })
    }
  },

  trackInstall: async (slug: string) => {
    try {
      await apiClient.api.plugins[':slug'].install.$post({ param: { slug } })
    } catch (error) {
      console.error('Failed to track install:', error)
    }
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),
  setSelectedCategory: (category: string | null) => set({ selectedCategory: category }),
  clearError: () => set({ error: null }),
  clearCurrentPlugin: () => set({ currentPlugin: null, reviews: [] }),
}))

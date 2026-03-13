import { create } from 'zustand'

interface LoadingState {
  count: number
  isLoading: boolean
  startLoading: () => void
  stopLoading: () => void
}

export const useLoadingStore = create<LoadingState>(set => ({
  count: 0,
  isLoading: false,
  startLoading: () =>
    set(state => ({
      count: state.count + 1,
      isLoading: true,
    })),
  stopLoading: () =>
    set(state => ({
      count: Math.max(0, state.count - 1),
      isLoading: state.count - 1 > 0,
    })),
}))

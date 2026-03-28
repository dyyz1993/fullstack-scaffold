import { useRef, useCallback, useEffect } from 'react'

const LOAD_MORE_THRESHOLD = 100

interface UseScrollLoadingOptions {
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => Promise<void>
}

interface UseScrollLoadingReturn {
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void
}

export function useScrollLoading({
  hasMore,
  loadingMore,
  onLoadMore,
}: UseScrollLoadingOptions): UseScrollLoadingReturn {
  const loadMoreTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const container = e.currentTarget
      if (!container || loadingMore) return

      if (container.scrollTop <= LOAD_MORE_THRESHOLD && hasMore) {
        if (loadMoreTimeoutRef.current) {
          clearTimeout(loadMoreTimeoutRef.current)
        }
        loadMoreTimeoutRef.current = setTimeout(() => {
          onLoadMore()
        }, 100)
      }
    },
    [hasMore, loadingMore, onLoadMore]
  )

  useEffect(() => {
    return () => {
      if (loadMoreTimeoutRef.current) {
        clearTimeout(loadMoreTimeoutRef.current)
      }
    }
  }, [])

  return {
    handleScroll,
  }
}

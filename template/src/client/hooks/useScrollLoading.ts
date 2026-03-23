import { useRef, useCallback, useEffect, useState } from 'react'

const LOAD_MORE_THRESHOLD = 100
const AUTO_SCROLL_THRESHOLD = 100

interface UseScrollLoadingOptions {
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => Promise<void>
  rounds: unknown[]
}

interface UseScrollLoadingReturn {
  containerRef: React.RefObject<HTMLDivElement>
  handleScroll: () => void
  isAtBottom: boolean
}

export function useScrollLoading({
  hasMore,
  loadingMore,
  onLoadMore,
  rounds,
}: UseScrollLoadingOptions): UseScrollLoadingReturn {
  const containerRef = useRef<HTMLDivElement>(null)
  const loadMoreTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevScrollHeightRef = useRef<number>(0)
  const prevScrollTopRef = useRef<number>(0)
  const [isAtBottom, setIsAtBottom] = useState(true)

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return
    setIsAtBottom(false)
    await onLoadMore()
  }, [hasMore, loadingMore, onLoadMore])

  const handleScroll = useCallback(() => {
    const container = containerRef.current
    if (!container || loadingMore) return

    const { scrollTop, scrollHeight, clientHeight } = container
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight

    if (distanceFromBottom <= AUTO_SCROLL_THRESHOLD) {
      setIsAtBottom(true)
    } else {
      setIsAtBottom(false)
    }

    if (scrollTop <= LOAD_MORE_THRESHOLD && hasMore) {
      prevScrollHeightRef.current = scrollHeight
      prevScrollTopRef.current = scrollTop

      if (loadMoreTimeoutRef.current) {
        clearTimeout(loadMoreTimeoutRef.current)
      }
      loadMoreTimeoutRef.current = setTimeout(() => {
        handleLoadMore()
      }, 100)
    }
  }, [hasMore, loadingMore, handleLoadMore])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const prevScrollHeight = prevScrollHeightRef.current
    const prevScrollTop = prevScrollTopRef.current
    const currentScrollHeight = container.scrollHeight

    if (currentScrollHeight > prevScrollHeight && prevScrollHeight > 0) {
      const heightDiff = currentScrollHeight - prevScrollHeight
      container.scrollTop = prevScrollTop + heightDiff

      prevScrollHeightRef.current = 0
      prevScrollTopRef.current = 0
    } else if (isAtBottom) {
      container.scrollTop = container.scrollHeight
    }
  }, [rounds, isAtBottom])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
  }, [])

  useEffect(() => {
    return () => {
      if (loadMoreTimeoutRef.current) {
        clearTimeout(loadMoreTimeoutRef.current)
      }
    }
  }, [])

  return {
    containerRef,
    handleScroll,
    isAtBottom,
  }
}

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { PluginDetailPage } from '../PluginDetailPage'
import type { Plugin, Review } from '@shared/schemas'

interface MockPluginStore {
  currentPlugin: Plugin | null
  reviews: Review[]
  loading: boolean
  error: string | null
  installedSlugs: Record<string, boolean>
  fetchPlugin: ReturnType<typeof vi.fn>
  fetchReviews: ReturnType<typeof vi.fn>
  fetchInstalledPlugins: ReturnType<typeof vi.fn>
  trackInstall: ReturnType<typeof vi.fn>
  submitReview: ReturnType<typeof vi.fn>
  clearCurrentPlugin: ReturnType<typeof vi.fn>
  setError: ReturnType<typeof vi.fn>
}

interface MockAuthStore {
  isAuthenticated: boolean
}

const mockStore: MockPluginStore = {
  currentPlugin: null,
  reviews: [],
  loading: false,
  error: null,
  installedSlugs: {},
  fetchPlugin: vi.fn().mockResolvedValue(undefined),
  fetchReviews: vi.fn().mockResolvedValue(undefined),
  fetchInstalledPlugins: vi.fn().mockResolvedValue(undefined),
  trackInstall: vi.fn().mockResolvedValue(false),
  submitReview: vi.fn().mockResolvedValue(undefined),
  clearCurrentPlugin: vi.fn(),
  setError: vi.fn(),
}

const mockAuthStore: MockAuthStore = { isAuthenticated: false }

vi.mock('@client/stores/pluginStore', () => ({
  usePluginStore: Object.assign(
    vi.fn((selector?: (state: MockPluginStore) => unknown) => {
      if (selector) {
        return selector(mockStore)
      }
      return mockStore
    }),
    {
      getState: () => mockStore,
    }
  ),
}))

vi.mock('@client/stores/authStore', () => ({
  useAuthStore: vi.fn((selector?: (state: MockAuthStore) => unknown) => {
    if (selector) {
      return selector(mockAuthStore)
    }
    return mockAuthStore
  }),
}))

const createMockPlugin = (): Plugin =>
  ({
    id: 1,
    name: 'Cool Plugin',
    slug: 'cool-plugin',
    description: 'A cool plugin',
    version: '1.0.0',
    authorName: 'dev',
    status: 'approved',
    downloadCount: 10,
    createdAt: new Date().toISOString(),
  }) as unknown as Plugin

const renderDetailPage = () =>
  render(
    <MemoryRouter initialEntries={['/plugins/cool-plugin']}>
      <Routes>
        <Route path="/plugins/:slug" element={<PluginDetailPage />} />
      </Routes>
    </MemoryRouter>
  )

describe('PluginDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore.currentPlugin = createMockPlugin()
    mockStore.reviews = []
    mockStore.loading = false
    mockStore.error = null
    mockStore.installedSlugs = {}
    mockAuthStore.isAuthenticated = false
  })

  describe('Initial Render', () => {
    it('should render plugin detail page with review form', () => {
      renderDetailPage()
      expect(screen.getByTestId('plugin-detail-page')).toBeInTheDocument()
      expect(screen.getByTestId('review-title-input')).toBeInTheDocument()
      expect(screen.getByTestId('review-content-input')).toBeInTheDocument()
      expect(screen.getByTestId('review-submit')).toBeInTheDocument()
    })

    it('should cap review inputs at schema limits via maxLength', () => {
      renderDetailPage()
      expect(screen.getByTestId('review-title-input')).toHaveAttribute('maxLength', '200')
      expect(screen.getByTestId('review-content-input')).toHaveAttribute('maxLength', '2000')
    })
  })

  describe('Overlong Review Guard (P2: 2000+ 字符评论白屏回归)', () => {
    it('should not submit 2001-char review content and show error instead of crashing', async () => {
      renderDetailPage()
      fireEvent.change(screen.getByTestId('review-content-input'), {
        target: { value: 'c'.repeat(2001) },
      })
      fireEvent.click(screen.getByTestId('review-submit'))

      await waitFor(() => {
        expect(mockStore.setError).toHaveBeenCalledWith(
          'Review content must be at most 2000 characters'
        )
      })
      expect(mockStore.submitReview).not.toHaveBeenCalled()
      // 页面未被卸载（白屏回归防线）
      expect(screen.getByTestId('plugin-detail-page')).toBeInTheDocument()
    })

    it('should not submit overlong review title', async () => {
      renderDetailPage()
      fireEvent.change(screen.getByTestId('review-title-input'), {
        target: { value: 't'.repeat(201) },
      })
      fireEvent.click(screen.getByTestId('review-submit'))

      await waitFor(() => {
        expect(mockStore.setError).toHaveBeenCalledWith(
          'Review title must be at most 200 characters'
        )
      })
      expect(mockStore.submitReview).not.toHaveBeenCalled()
      expect(screen.getByTestId('plugin-detail-page')).toBeInTheDocument()
    })

    it('should submit review when inputs are within limits', async () => {
      mockStore.submitReview.mockImplementation(async () => {
        // 成功路径：store 不留 error
      })
      renderDetailPage()
      fireEvent.change(screen.getByTestId('review-title-input'), { target: { value: 'Great' } })
      fireEvent.change(screen.getByTestId('review-content-input'), {
        target: { value: 'Loved it' },
      })
      fireEvent.click(screen.getByTestId('review-submit'))

      await waitFor(() => {
        expect(mockStore.submitReview).toHaveBeenCalledWith('cool-plugin', {
          rating: 5,
          title: 'Great',
          content: 'Loved it',
        })
      })
    })
  })

  describe('Server Error Display', () => {
    it('should render server error string in review error banner', () => {
      mockStore.error = 'content: Review content too long'
      renderDetailPage()
      expect(screen.getByTestId('review-error')).toBeInTheDocument()
      expect(screen.getByText('content: Review content too long')).toBeInTheDocument()
    })
  })
})

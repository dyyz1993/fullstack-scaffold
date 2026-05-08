import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MemoryRouter } from 'react-router-dom'
import { ContentListPage } from '../ContentListPage'
import type { Content } from '@shared/modules/content'

const mockContents: Content[] = [
  {
    id: 'content-1',
    title: 'First Article',
    content: 'First article content body that is long enough for testing purposes.',
    category: 'article',
    status: 'published',
    author: 'Author A',
    tags: ['tag1'],
    viewCount: 50,
    likeCount: 5,
    createdAt: '2024-01-10T10:00:00.000Z',
    updatedAt: '2024-01-10T10:00:00.000Z',
    publishedAt: '2024-01-10T10:00:00.000Z',
  },
  {
    id: 'content-2',
    title: 'Second Announcement',
    content: 'Second announcement content body for testing.',
    category: 'announcement',
    status: 'published',
    author: 'Author B',
    tags: [],
    viewCount: 200,
    likeCount: 20,
    createdAt: '2024-01-12T10:00:00.000Z',
    updatedAt: '2024-01-12T10:00:00.000Z',
    publishedAt: '2024-01-12T10:00:00.000Z',
  },
]

const mockApiGet = vi.fn()

vi.mock('@client/services/apiClient', () => ({
  apiClient: {
    api: {
      public: {
        contents: {
          $get: (...args: unknown[]) => mockApiGet(...args),
        },
      },
    },
  },
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <ContentListPage />
    </MemoryRouter>
  )
}

describe('ContentListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('should show loading indicator on initial render', () => {
      mockApiGet.mockReturnValue(new Promise(() => {}))
      renderPage()
      expect(screen.getByText('加载中...')).toBeInTheDocument()
    })
  })

  describe('Success State', () => {
    beforeEach(() => {
      mockApiGet.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockContents }),
      })
    })

    it('should display page title and description', async () => {
      renderPage()
      expect(screen.getByText('内容中心')).toBeInTheDocument()
      expect(screen.getByText(/浏览最新的文章/)).toBeInTheDocument()
      await waitFor(() => {
        expect(screen.getByTestId('content-list-page')).toBeInTheDocument()
      })
    })

    it('should display content items', async () => {
      renderPage()
      await waitFor(() => {
        expect(screen.getByText('First Article')).toBeInTheDocument()
        expect(screen.getByText('Second Announcement')).toBeInTheDocument()
      })
    })

    it('should display content categories', async () => {
      renderPage()
      await waitFor(() => {
        expect(screen.getByText('文章')).toBeInTheDocument()
        expect(screen.getByText('公告')).toBeInTheDocument()
      })
    })

    it('should display category filter buttons', () => {
      renderPage()
      expect(screen.getByText('全部')).toBeInTheDocument()
      expect(screen.getByText('文章')).toBeInTheDocument()
      expect(screen.getByText('公告')).toBeInTheDocument()
      expect(screen.getByText('教程')).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no contents', async () => {
      mockApiGet.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      })
      renderPage()
      await waitFor(() => {
        expect(screen.getByText('暂无内容')).toBeInTheDocument()
      })
    })
  })

  describe('Error State', () => {
    it('should show error message on API failure', async () => {
      mockApiGet.mockResolvedValue({
        ok: true,
        json: async () => ({ success: false }),
      })
      renderPage()
      await waitFor(() => {
        expect(screen.getByText('Failed to fetch contents')).toBeInTheDocument()
      })
    })

    it('should show network error on fetch rejection', async () => {
      mockApiGet.mockRejectedValue(new Error('Network error'))
      renderPage()
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })
  })

  describe('Filter Functionality', () => {
    beforeEach(() => {
      mockApiGet.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockContents }),
      })
    })

    it('should call API with category filter when category button clicked', async () => {
      renderPage()
      const articleButton = screen
        .getAllByText('文章')
        .find(el => el.closest('button') !== null) as HTMLElement
      fireEvent.click(articleButton)
      await waitFor(() => {
        expect(mockApiGet).toHaveBeenCalledWith(
          expect.objectContaining({
            query: expect.objectContaining({ category: 'article' }),
          })
        )
      })
    })
  })

  describe('Search', () => {
    beforeEach(() => {
      mockApiGet.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockContents }),
      })
    })

    it('should render search input and button', () => {
      renderPage()
      expect(screen.getByPlaceholderText('搜索内容...')).toBeInTheDocument()
      expect(screen.getByText('搜索')).toBeInTheDocument()
    })

    it('should call API with search query on form submit', async () => {
      renderPage()
      const input = screen.getByPlaceholderText('搜索内容...')
      fireEvent.change(input, { target: { value: 'test query' } })
      fireEvent.click(screen.getByText('搜索'))
      await waitFor(() => {
        expect(mockApiGet).toHaveBeenCalledWith(
          expect.objectContaining({
            query: expect.objectContaining({ search: 'test query' }),
          })
        )
      })
    })
  })
})

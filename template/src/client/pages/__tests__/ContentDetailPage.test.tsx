import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ContentDetailPage } from '../ContentDetailPage'
import type { Content } from '@shared/modules/content'

const mockContent: Content = {
  id: 'content-1',
  title: 'Test Article',
  content:
    'This is a test article content that is long enough to be meaningful for testing purposes.',
  category: 'article',
  status: 'published',
  author: 'Test Author',
  tags: ['test', 'article'],
  viewCount: 100,
  likeCount: 10,
  createdAt: '2024-01-15T10:30:00.000Z',
  updatedAt: '2024-01-15T10:30:00.000Z',
  publishedAt: '2024-01-15T10:30:00.000Z',
}

const mockApiGet = vi.fn()

vi.mock('@client/services/apiClient', () => ({
  apiClient: {
    api: {
      public: {
        contents: {
          ':id': {
            $get: (...args: unknown[]) => mockApiGet(...args),
          },
        },
      },
    },
  },
}))

function renderWithRouter(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/content/${id}`]}>
      <Routes>
        <Route path="/content/:id" element={<ContentDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ContentDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('should show loading indicator on initial render', () => {
      mockApiGet.mockReturnValue(new Promise(() => {}))
      renderWithRouter('content-1')
      expect(screen.getByText('加载中...')).toBeInTheDocument()
    })
  })

  describe('Success State', () => {
    it('should display content title and body', async () => {
      mockApiGet.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: mockContent }),
      })
      renderWithRouter('content-1')
      await waitFor(() => {
        expect(screen.getByText('Test Article')).toBeInTheDocument()
        expect(screen.getByText(mockContent.content)).toBeInTheDocument()
      })
    })

    it('should display content category and tags', async () => {
      mockApiGet.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: mockContent }),
      })
      renderWithRouter('content-1')
      await waitFor(() => {
        expect(screen.getByText('article')).toBeInTheDocument()
        expect(screen.getByText('test')).toBeInTheDocument()
        expect(screen.getByText('article')).toBeInTheDocument()
      })
    })

    it('should display author and view/like counts', async () => {
      mockApiGet.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: mockContent }),
      })
      renderWithRouter('content-1')
      await waitFor(() => {
        expect(screen.getByText(/Test Author/)).toBeInTheDocument()
        expect(screen.getByText(/100 阅读/)).toBeInTheDocument()
        expect(screen.getByText(/10 喜欢/)).toBeInTheDocument()
      })
    })

    it('should render with data-testid', async () => {
      mockApiGet.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: mockContent }),
      })
      renderWithRouter('content-1')
      await waitFor(() => {
        expect(screen.getByTestId('content-detail-page')).toBeInTheDocument()
      })
    })
  })

  describe('Error State', () => {
    it('should show error when content not found (404)', async () => {
      mockApiGet.mockResolvedValue({
        ok: false,
        status: 404,
      })
      renderWithRouter('nonexistent')
      await waitFor(() => {
        expect(screen.getByText('内容不存在')).toBeInTheDocument()
      })
    })

    it('should show error on server error', async () => {
      mockApiGet.mockResolvedValue({
        ok: false,
        status: 500,
      })
      renderWithRouter('content-1')
      await waitFor(() => {
        expect(screen.getByText('加载失败')).toBeInTheDocument()
      })
    })

    it('should show network error on fetch failure', async () => {
      mockApiGet.mockRejectedValue(new Error('Network error'))
      renderWithRouter('content-1')
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    it('should show back link on error', async () => {
      mockApiGet.mockResolvedValue({
        ok: false,
        status: 404,
      })
      renderWithRouter('nonexistent')
      await waitFor(() => {
        expect(screen.getByText(/返回内容列表/)).toBeInTheDocument()
      })
    })
  })

  describe('API Call', () => {
    it('should call API with correct content id', async () => {
      mockApiGet.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: mockContent }),
      })
      renderWithRouter('content-42')
      await waitFor(() => {
        expect(mockApiGet).toHaveBeenCalledWith({
          param: { id: 'content-42' },
        })
      })
    })
  })
})

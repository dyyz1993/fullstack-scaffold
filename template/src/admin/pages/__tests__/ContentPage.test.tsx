import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContentPage } from '../ContentPage'
import type { Content } from '@shared/modules/content'

const mockContents: Content[] = [
  {
    id: '1',
    title: 'Test Article',
    content: 'Test content body',
    category: 'article',
    status: 'published',
    author: 'admin',
    tags: ['test'],
    viewCount: 10,
    likeCount: 5,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    publishedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: '2',
    title: 'Draft Post',
    content: 'Draft content',
    category: 'announcement',
    status: 'draft',
    author: 'editor',
    tags: [],
    viewCount: 0,
    likeCount: 0,
    createdAt: '2025-01-02T00:00:00.000Z',
    updatedAt: '2025-01-02T00:00:00.000Z',
    publishedAt: null,
  },
]

const mockContentsGet = vi.fn()
const mockContentPost = vi.fn()
const mockContentByIdGet = vi.fn()
const mockContentByIdPut = vi.fn()
const mockContentByIdDelete = vi.fn()

vi.mock('../../services/apiClient', () => ({
  apiClient: {
    api: {
      contents: {
        $get: () => mockContentsGet(),
        $post: (...args: unknown[]) => mockContentPost(...args),
        ':id': {
          $get: () => mockContentByIdGet(),
          $put: (...args: unknown[]) => mockContentByIdPut(...args),
          $delete: (...args: unknown[]) => mockContentByIdDelete(...args),
        },
      },
    },
  },
}))

vi.mock('../../components/PermissionGuard', () => ({
  PermissionGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('antd', async () => {
  const actual = await vi.importActual('antd')
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
    },
  }
})

describe('ContentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockContentsGet.mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: mockContents }),
    })
    mockContentPost.mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: { id: '3' } }),
    })
    mockContentByIdPut.mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: mockContents[0] }),
    })
    mockContentByIdDelete.mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    })
  })

  it('renders content table on mount', async () => {
    render(<ContentPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Article')).toBeInTheDocument()
      expect(screen.getByText('Draft Post')).toBeInTheDocument()
    })
  })

  it('create content button opens modal', async () => {
    const user = userEvent.setup()
    render(<ContentPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /创建内容/ })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /创建内容/ }))

    await waitFor(() => {
      expect(screen.getByLabelText('标题')).toBeInTheDocument()
    })
  })

  it('create content form submits', async () => {
    const user = userEvent.setup()
    render(<ContentPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /创建内容/ })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /创建内容/ }))

    await waitFor(() => {
      expect(screen.getByLabelText('标题')).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText('标题'), 'New Article')

    await user.click(screen.getByLabelText('分类'))
    await waitFor(() => {
      const articles = screen.getAllByText('文章')
      expect(articles.length).toBeGreaterThan(0)
    })
    await user.click(screen.getAllByText('文章').pop()!)

    await user.type(screen.getByLabelText('内容'), 'New content body')

    const modalFooter = document.querySelector('.ant-modal-footer')
    const okBtn = modalFooter?.querySelector('.ant-btn-primary')
    expect(okBtn).toBeTruthy()
    await user.click(okBtn!)

    await waitFor(() => {
      expect(mockContentPost).toHaveBeenCalled()
    })
  })

  it('edit content opens pre-filled modal', async () => {
    const user = userEvent.setup()
    render(<ContentPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Article')).toBeInTheDocument()
    })

    const editButtons = screen.getAllByText('编辑')
    await user.click(editButtons[0])

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Article')).toBeInTheDocument()
    })
  })

  it('delete content with confirmation', async () => {
    const user = userEvent.setup()
    render(<ContentPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Article')).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByRole('button', { name: /删除/ })
    await user.click(deleteButtons[0])

    await waitFor(() => {
      expect(screen.getByText('确定要删除这个内容吗？')).toBeInTheDocument()
    })

    const okButton = document.querySelector('.ant-modal-confirm-btns .ant-btn-primary')
    if (okButton) {
      await user.click(okButton)
    }

    if (mockContentByIdDelete.mock.calls.length === 0) {
      await waitFor(() => {
        expect(mockContentByIdDelete).toHaveBeenCalled()
      })
    }
  })

  it('status badge shows correct state', async () => {
    render(<ContentPage />)

    await waitFor(() => {
      expect(screen.getByText('已发布')).toBeInTheDocument()
      expect(screen.getByText('草稿')).toBeInTheDocument()
    })
  })

  it('permission-guarded CRUD buttons render', async () => {
    render(<ContentPage />)

    await waitFor(() => {
      const editButtons = screen.getAllByText('编辑')
      const deleteButtons = screen.getAllByText('删除')
      expect(editButtons.length).toBeGreaterThan(0)
      expect(deleteButtons.length).toBeGreaterThan(0)
    })
  })
})

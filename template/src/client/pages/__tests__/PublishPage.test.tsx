import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MemoryRouter } from 'react-router-dom'
import { PublishPage } from '../PublishPage'
import type { CreatePluginInput } from '@shared/schemas'

interface MockPluginStore {
  loading: boolean
  error: string | null
  createPlugin: ReturnType<typeof vi.fn>
  clearError: ReturnType<typeof vi.fn>
  setError: ReturnType<typeof vi.fn>
}

const mockStore: MockPluginStore = {
  loading: false,
  error: null,
  createPlugin: vi.fn().mockResolvedValue('my-plugin'),
  clearError: vi.fn(),
  setError: vi.fn(),
}

vi.mock('@client/stores/pluginStore', () => ({
  usePluginStore: vi.fn((selector?: (state: MockPluginStore) => unknown) => {
    if (selector) {
      return selector(mockStore)
    }
    return mockStore
  }),
}))

const renderPublishPage = () =>
  render(
    <MemoryRouter>
      <PublishPage />
    </MemoryRouter>
  )

const validForm: CreatePluginInput = {
  name: 'My Plugin',
  slug: 'my-plugin',
  description: 'Does things',
}

describe('PublishPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore.loading = false
    mockStore.error = null
    mockStore.createPlugin.mockResolvedValue('my-plugin')
  })

  describe('Initial Render', () => {
    it('should render publish page', () => {
      renderPublishPage()
      expect(screen.getByTestId('publish-page')).toBeInTheDocument()
      expect(screen.getByTestId('publish-name')).toBeInTheDocument()
      expect(screen.getByTestId('publish-slug')).toBeInTheDocument()
      expect(screen.getByTestId('publish-description')).toBeInTheDocument()
      expect(screen.getByTestId('publish-submit')).toBeInTheDocument()
    })

    it('should cap inputs at schema limits via maxLength', () => {
      renderPublishPage()
      expect(screen.getByTestId('publish-name')).toHaveAttribute('maxLength', '200')
      expect(screen.getByTestId('publish-slug')).toHaveAttribute('maxLength', '200')
      expect(screen.getByTestId('publish-description')).toHaveAttribute('maxLength', '2000')
    })
  })

  describe('Overlong Input Guard (P2: 超长字段白屏回归)', () => {
    it('should not submit with 2001-char description and show error instead of crashing', async () => {
      renderPublishPage()
      fireEvent.change(screen.getByTestId('publish-name'), {
        target: { value: validForm.name },
      })
      fireEvent.change(screen.getByTestId('publish-slug'), { target: { value: validForm.slug } })
      fireEvent.change(screen.getByTestId('publish-description'), {
        target: { value: 'x'.repeat(2001) },
      })
      fireEvent.click(screen.getByTestId('publish-submit'))

      await waitFor(() => {
        expect(mockStore.setError).toHaveBeenCalledWith(
          'Description must be at most 2000 characters'
        )
      })
      expect(mockStore.createPlugin).not.toHaveBeenCalled()
      // 页面未被卸载（白屏回归防线）
      expect(screen.getByTestId('publish-page')).toBeInTheDocument()
    })

    it('should not submit with overlong name', async () => {
      renderPublishPage()
      fireEvent.change(screen.getByTestId('publish-name'), { target: { value: 'n'.repeat(201) } })
      fireEvent.change(screen.getByTestId('publish-slug'), { target: { value: validForm.slug } })
      fireEvent.change(screen.getByTestId('publish-description'), {
        target: { value: validForm.description },
      })
      fireEvent.click(screen.getByTestId('publish-submit'))

      await waitFor(() => {
        expect(mockStore.setError).toHaveBeenCalledWith(
          'Plugin name must be at most 200 characters'
        )
      })
      expect(mockStore.createPlugin).not.toHaveBeenCalled()
      expect(screen.getByTestId('publish-page')).toBeInTheDocument()
    })
  })

  describe('Server Error Display', () => {
    it('should render server error string', () => {
      mockStore.error = 'name: Slug already exists'
      renderPublishPage()
      expect(screen.getByTestId('publish-error')).toBeInTheDocument()
      expect(screen.getByText('name: Slug already exists')).toBeInTheDocument()
    })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PluginManagementPage } from '../PluginManagementPage'
import type { Plugin } from '@shared/modules/plugins'

function makePlugin(overrides: Partial<Plugin> & Pick<Plugin, 'id' | 'slug' | 'status'>): Plugin {
  return {
    name: `Plugin ${overrides.id}`,
    description: 'A test plugin',
    authorId: 'u1',
    authorName: 'Author',
    version: '1.0.0',
    downloadCount: 0,
    viewCount: 0,
    featured: false,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    ...overrides,
  }
}

const mockPlugins: Plugin[] = [
  makePlugin({
    id: '1',
    name: 'Pending Plugin',
    slug: 'pending-plugin',
    authorName: 'Author One',
    status: 'pending',
    downloadCount: 120,
    viewCount: 10,
  }),
  makePlugin({
    id: '2',
    name: 'Approved Plugin',
    slug: 'approved-plugin',
    authorName: 'Author Two',
    status: 'approved',
    downloadCount: 300,
    viewCount: 20,
    featured: true,
    createdAt: 1700000001000,
    updatedAt: 1700000001000,
  }),
  makePlugin({
    id: '3',
    name: 'Rejected Plugin',
    slug: 'rejected-plugin',
    authorName: 'Author Three',
    status: 'rejected',
    downloadCount: 5,
    viewCount: 1,
    createdAt: 1700000002000,
    updatedAt: 1700000002000,
  }),
]

const mockListGet = vi.fn()
const mockApprovePut = vi.fn()
const mockRejectPut = vi.fn()
const mockDelete = vi.fn()
const mockFeaturePut = vi.fn()

vi.mock('@admin/services/apiClient', () => ({
  apiClient: {
    api: {
      plugins: {
        admin: {
          list: { $get: () => mockListGet() },
          ':slug': { $delete: (...args: unknown[]) => mockDelete(...args) },
        },
        ':slug': {
          approve: { $put: (...args: unknown[]) => mockApprovePut(...args) },
          reject: { $put: (...args: unknown[]) => mockRejectPut(...args) },
          feature: { $put: (...args: unknown[]) => mockFeaturePut(...args) },
        },
      },
    },
  },
  // 模拟真实 api() 契约：接收 Response-like Promise，json() 校验 ok/success 后解包 data
  api: (promise: {
    then: (
      fn: (r: {
        ok: boolean
        json: () => Promise<{ success: boolean; data?: unknown; error?: string }>
      }) => unknown
    ) => unknown
  }) => ({
    withLoading: () => ({
      json: () =>
        promise.then(r => {
          if (!r.ok) throw new Error('request failed')
          return r.json().then(body => {
            if (!body.success) throw new Error(body.error ?? 'api error')
            return body.data
          })
        }),
    }),
  }),
}))

vi.mock('antd', async () => {
  const actual = await vi.importActual('antd')
  return {
    ...actual,
    message: {
      success: vi.fn(),
      warning: vi.fn(),
      error: vi.fn(),
    },
  }
})

vi.mock('@admin/i18n/useLanguage', () => ({
  useLanguage: () => ({ formatDate: (d: string) => d, t: (k: string) => k }),
}))

function responseOf(data: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve({ success: true, data }),
  })
}

describe('PluginManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListGet.mockReturnValue(
      responseOf({ plugins: mockPlugins, total: mockPlugins.length, page: 1, limit: 20 })
    )
    mockApprovePut.mockReturnValue(responseOf(mockPlugins[0]))
    mockRejectPut.mockReturnValue(responseOf(mockPlugins[0]))
    mockDelete.mockReturnValue(responseOf({ slug: 'x' }))
    mockFeaturePut.mockReturnValue(responseOf(mockPlugins[0]))
  })

  it('renders plugin table with name, author and status badges', async () => {
    render(<PluginManagementPage />)

    await waitFor(() => {
      expect(screen.getByText('Pending Plugin')).toBeInTheDocument()
      expect(screen.getByText('Approved Plugin')).toBeInTheDocument()
      expect(screen.getByText('Rejected Plugin')).toBeInTheDocument()
    })

    expect(screen.getByText('Author One')).toBeInTheDocument()
    expect(screen.getByText('Author Two')).toBeInTheDocument()
    expect(screen.getByText('待审核')).toBeInTheDocument()
    expect(screen.getByText('已通过')).toBeInTheDocument()
    expect(screen.getByText('已拒绝')).toBeInTheDocument()
  })

  it('pending plugins offer approve and reject actions', async () => {
    const user = userEvent.setup()
    render(<PluginManagementPage />)

    await waitFor(() => {
      expect(screen.getByText('Pending Plugin')).toBeInTheDocument()
    })

    const approveButtons = screen.getAllByRole('button', { name: /通过/ })
    expect(approveButtons.length).toBeGreaterThanOrEqual(1)
    await user.click(approveButtons[0])

    const confirm = await screen.findByText('确定通过此插件审核？')
    expect(confirm).toBeInTheDocument()
    const okBtn = document.querySelector(
      '.ant-popover-buttons .ant-btn-primary, .ant-popconfirm .ant-btn-primary'
    )
    if (okBtn) {
      await user.click(okBtn)
      await waitFor(() => {
        expect(mockApprovePut).toHaveBeenCalledWith({ param: { slug: 'pending-plugin' } })
      })
    }
  })

  it('approved plugins offer 下架 (unpublish) which calls reject with reason', async () => {
    const user = userEvent.setup()
    render(<PluginManagementPage />)

    await waitFor(() => {
      expect(screen.getByText('Approved Plugin')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /下架/ }))

    await waitFor(() => {
      expect(screen.getByText('下架插件')).toBeInTheDocument()
    })

    const textarea = screen.getByPlaceholderText('请输入拒绝原因...')
    await user.type(textarea, 'violates policy')

    const modalFooter = document.querySelector('.ant-modal-footer')
    const okBtn = modalFooter?.querySelector('.ant-btn-primary')
    expect(okBtn).toBeTruthy()
    await user.click(okBtn!)

    await waitFor(() => {
      expect(mockRejectPut).toHaveBeenCalledWith({
        param: { slug: 'approved-plugin' },
        json: { reason: 'violates policy' },
      })
    })
  })

  it('rejected plugins offer 上架 (re-approve)', async () => {
    const user = userEvent.setup()
    render(<PluginManagementPage />)

    await waitFor(() => {
      expect(screen.getByText('Rejected Plugin')).toBeInTheDocument()
    })

    const publishButtons = screen.getAllByRole('button', { name: /上架/ })
    expect(publishButtons.length).toBeGreaterThanOrEqual(1)
    await user.click(publishButtons[0])

    const confirm = await screen.findByText('确定重新上架此插件？')
    expect(confirm).toBeInTheDocument()
    const okBtn = document.querySelector(
      '.ant-popover-buttons .ant-btn-primary, .ant-popconfirm .ant-btn-primary'
    )
    if (okBtn) {
      await user.click(okBtn)
      await waitFor(() => {
        expect(mockApprovePut).toHaveBeenCalledWith({ param: { slug: 'rejected-plugin' } })
      })
    }
  })

  it('delete action calls admin delete endpoint after confirm', async () => {
    const user = userEvent.setup()
    render(<PluginManagementPage />)

    await waitFor(() => {
      expect(screen.getByText('Pending Plugin')).toBeInTheDocument()
    })

    // 在目标行内定位删除按钮，避免全局按钮顺序歧义
    const pendingRow = screen.getByText('Pending Plugin').closest('tr')!
    const delBtn = within(pendingRow).getByRole('button', { name: /删除/ })
    await user.click(delBtn)

    await waitFor(() => {
      expect(screen.getByText('确定要删除此插件吗？此操作不可恢复')).toBeInTheDocument()
    })

    // 从确认弹层内容向上定位 Popconfirm 实例，再点其中的确认按钮
    const confirmText = screen.getByText('确定要删除此插件吗？此操作不可恢复')
    const popconfirmRoot = confirmText.closest('.ant-popconfirm')
    const okBtn = popconfirmRoot?.querySelector('.ant-btn-primary')
    expect(okBtn).toBeTruthy()
    fireEvent.click(okBtn!)
    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith({ param: { slug: 'pending-plugin' } })
    })
  })

  it('reject modal requires a reason', async () => {
    const user = userEvent.setup()
    render(<PluginManagementPage />)

    await waitFor(() => {
      expect(screen.getByText('Pending Plugin')).toBeInTheDocument()
    })

    const rejectButtons = screen.getAllByRole('button', { name: /拒绝/ })
    await user.click(rejectButtons[0])

    await waitFor(() => {
      expect(screen.getByText('拒绝插件')).toBeInTheDocument()
    })

    // 不填原因直接确认 -> 不应调用接口
    const modalFooter = document.querySelector('.ant-modal-footer')
    const okBtn = modalFooter?.querySelector('.ant-btn-primary')
    expect(okBtn).toBeTruthy()
    await user.click(okBtn!)

    await waitFor(() => {
      expect(mockRejectPut).not.toHaveBeenCalled()
    })
  })
})

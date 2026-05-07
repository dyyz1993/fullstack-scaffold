import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { PermissionConfigEditor } from '../PermissionConfigEditor'
import type { PermissionInfo } from '@shared/modules/permission'

vi.mock('antd', async () => {
  const React = await import('react')
  const OriginAntd = await import('antd')
  return {
    ...OriginAntd,
    message: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    },
  }
})

const mockPermissions: PermissionInfo[] = [
  { permission: 'user:view', label: '查看用户', category: 'user', description: '查看用户列表' },
  { permission: 'user:create', label: '创建用户', category: 'user', description: '创建新用户' },
  { permission: 'content:view', label: '查看内容', category: 'content', description: '查看内容列表' },
  { permission: 'content:edit', label: '编辑内容', category: 'content', description: '编辑内容' },
  { permission: 'order:view', label: '查看订单', category: 'order', description: '查看订单列表' },
]

const defaultProps = {
  visible: true,
  title: '权限配置',
  permissions: mockPermissions,
  selectedPermissions: ['user:view', 'content:view'],
  onCancel: vi.fn(),
  onOk: vi.fn(),
}

describe('PermissionConfigEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('should return null when visible is false', () => {
    const { container } = render(<PermissionConfigEditor {...defaultProps} visible={false} />)
    expect(container.innerHTML).toBe('')
  })

  it('should render when visible is true', () => {
    render(<PermissionConfigEditor {...defaultProps} />)
    expect(screen.getByText('JSON编辑器')).toBeInTheDocument()
    expect(screen.getByText('权限模板')).toBeInTheDocument()
    expect(screen.getByText('帮助')).toBeInTheDocument()
  })

  it('should populate JSON editor with selected permissions', () => {
    render(<PermissionConfigEditor {...defaultProps} />)
    const textarea = screen.getByPlaceholderText('["permission1", "permission2"]')
    expect(textarea).toHaveValue(JSON.stringify(['user:view', 'content:view'], null, 2))
  })

  it('should format JSON on format button click', async () => {
    render(<PermissionConfigEditor {...defaultProps} />)
    const textarea = screen.getByPlaceholderText('["permission1", "permission2"]')
    fireEvent.change(textarea, { target: { value: '["user:view","content:view"]' } })
    fireEvent.click(screen.getByText('格式化'))

    const { message } = await import('antd')
    expect(message.success).toHaveBeenCalledWith('JSON格式化成功')
  })

  it('should show error on invalid JSON format', async () => {
    render(<PermissionConfigEditor {...defaultProps} />)
    const textarea = screen.getByPlaceholderText('["permission1", "permission2"]')
    fireEvent.change(textarea, { target: { value: '{invalid json' } })
    fireEvent.click(screen.getByText('格式化'))

    const { message } = await import('antd')
    expect(message.error).toHaveBeenCalledWith('JSON格式错误')
  })

  it('should call onOk with parsed permissions on save', async () => {
    render(<PermissionConfigEditor {...defaultProps} />)
    fireEvent.click(screen.getByText('保存'))

    expect(defaultProps.onOk).toHaveBeenCalledWith(['user:view', 'content:view'])
  })

  it('should show error when saving with invalid JSON', async () => {
    render(<PermissionConfigEditor {...defaultProps} />)
    const textarea = screen.getByPlaceholderText('["permission1", "permission2"]')
    fireEvent.change(textarea, { target: { value: 'not json' } })
    fireEvent.click(screen.getByText('保存'))

    const { message } = await import('antd')
    expect(message.error).toHaveBeenCalledWith('请修复JSON错误后再保存')
    expect(defaultProps.onOk).not.toHaveBeenCalled()
  })

  it('should show error when JSON is not an array', async () => {
    render(<PermissionConfigEditor {...defaultProps} />)
    const textarea = screen.getByPlaceholderText('["permission1", "permission2"]')
    fireEvent.change(textarea, { target: { value: '{"key": "value"}' } })
    fireEvent.click(screen.getByText('保存'))

    expect(screen.getByText(/配置必须是数组格式/)).toBeInTheDocument()
  })

  it('should show error for invalid permission values', async () => {
    render(<PermissionConfigEditor {...defaultProps} />)
    const textarea = screen.getByPlaceholderText('["permission1", "permission2"]')
    fireEvent.change(textarea, { target: { value: '["user:view", "invalid:perm"]' } })
    fireEvent.click(screen.getByText('保存'))

    expect(screen.getByText(/无效的权限/)).toBeInTheDocument()
  })

  it('should load template on template button click', async () => {
    render(<PermissionConfigEditor {...defaultProps} />)
    fireEvent.click(screen.getByText('权限模板'))

    const superAdminButton = screen.getByText('超级管理员')
    fireEvent.click(superAdminButton)

    const { message } = await import('antd')
    expect(message.success).toHaveBeenCalledWith('模板加载成功')
  })

  it('should render help tab with permissions list', () => {
    render(<PermissionConfigEditor {...defaultProps} />)
    fireEvent.click(screen.getByText('帮助'))

    expect(screen.getByText('user:view')).toBeInTheDocument()
    expect(screen.getByText('content:view')).toBeInTheDocument()
    expect(screen.getByText('权限配置说明')).toBeInTheDocument()
  })

  it('should update jsonValue on textarea change', () => {
    render(<PermissionConfigEditor {...defaultProps} />)
    const textarea = screen.getByPlaceholderText('["permission1", "permission2"]')
    fireEvent.change(textarea, { target: { value: '["user:create"]' } })

    expect(textarea).toHaveValue('["user:create"]')
  })
})

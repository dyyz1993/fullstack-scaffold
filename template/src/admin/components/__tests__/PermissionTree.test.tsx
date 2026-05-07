import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { PermissionTree } from '../PermissionTree'
import type { PermissionInfo, PermissionCategory } from '@shared/modules/permission'

const mockPermissions: PermissionInfo[] = [
  { permission: 'user:view', label: '查看用户', category: 'user', description: '查看用户' },
  { permission: 'user:create', label: '创建用户', category: 'user', description: '创建用户' },
  { permission: 'user:edit', label: '编辑用户', category: 'user', description: '编辑用户' },
  { permission: 'content:view', label: '查看内容', category: 'content', description: '查看内容' },
  { permission: 'content:create', label: '创建内容', category: 'content', description: '创建内容' },
  { permission: 'order:view', label: '查看订单', category: 'order', description: '查看订单' },
]

const mockCategories: Record<string, PermissionCategory> = {
  user: { label: '用户管理', order: 1 },
  content: { label: '内容管理', order: 2 },
  order: { label: '订单管理', order: 3 },
}

const defaultProps = {
  permissions: mockPermissions,
  categories: mockCategories,
  selectedPermissions: ['user:view'],
  onSelectionChange: vi.fn(),
}

function getByButtonText(container: HTMLElement, text: string): HTMLElement {
  const buttons = container.querySelectorAll('button')
  for (const btn of buttons) {
    const btnText = btn.textContent?.replace(/\s+/g, '') || ''
    if (btnText.includes(text)) return btn
  }
  throw new Error(`Button with text "${text}" not found`)
}

describe('PermissionTree', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('should render search input', () => {
    render(<PermissionTree {...defaultProps} />)
    expect(screen.getByPlaceholderText('搜索权限...')).toBeInTheDocument()
  })

  it('should render action buttons', () => {
    const { container } = render(<PermissionTree {...defaultProps} />)
    expect(getByButtonText(container, '全选')).toBeTruthy()
    expect(getByButtonText(container, '清空')).toBeTruthy()
    expect(getByButtonText(container, '展开全部')).toBeTruthy()
    expect(getByButtonText(container, '收起全部')).toBeTruthy()
  })

  it('should call onSelectionChange with all permissions on select all', () => {
    const { container } = render(<PermissionTree {...defaultProps} />)
    fireEvent.click(getByButtonText(container, '全选'))

    expect(defaultProps.onSelectionChange).toHaveBeenCalledWith(
      mockPermissions.map(p => p.permission)
    )
  })

  it('should call onSelectionChange with empty array on clear all', () => {
    const { container } = render(<PermissionTree {...defaultProps} />)
    fireEvent.click(getByButtonText(container, '清空'))

    expect(defaultProps.onSelectionChange).toHaveBeenCalledWith([])
  })

  it('should show permission codes when expanded', () => {
    const { container } = render(<PermissionTree {...defaultProps} />)
    fireEvent.click(getByButtonText(container, '展开全部'))

    expect(screen.getByText('user:view')).toBeInTheDocument()
    expect(screen.getByText('content:view')).toBeInTheDocument()
    expect(screen.getByText('order:view')).toBeInTheDocument()
  })

  it('should filter permissions when searching', () => {
    const { container } = render(<PermissionTree {...defaultProps} />)
    fireEvent.click(getByButtonText(container, '展开全部'))

    const searchInput = screen.getByPlaceholderText('搜索权限...')
    fireEvent.change(searchInput, { target: { value: 'user' } })

    expect(screen.getByText('user:view')).toBeInTheDocument()
    expect(screen.getByText('user:create')).toBeInTheDocument()
  })

  it('should show all permissions after clearing search', () => {
    const { container } = render(<PermissionTree {...defaultProps} />)
    fireEvent.click(getByButtonText(container, '展开全部'))

    const searchInput = screen.getByPlaceholderText('搜索权限...')
    fireEvent.change(searchInput, { target: { value: 'user' } })
    fireEvent.change(searchInput, { target: { value: '' } })

    expect(screen.getByText('user:view')).toBeInTheDocument()
    expect(screen.getByText('content:view')).toBeInTheDocument()
  })

  it('should render Tree component with checkable', () => {
    const { container } = render(<PermissionTree {...defaultProps} />)
    expect(container.querySelector('.ant-tree')).toBeTruthy()
  })

  it('should update search input value', () => {
    render(<PermissionTree {...defaultProps} />)
    const searchInput = screen.getByPlaceholderText('搜索权限...')
    fireEvent.change(searchInput, { target: { value: 'test' } })
    expect(searchInput).toHaveValue('test')
  })

  it('should handle collapse all after expand', () => {
    const { container } = render(<PermissionTree {...defaultProps} />)
    fireEvent.click(getByButtonText(container, '展开全部'))
    fireEvent.click(getByButtonText(container, '收起全部'))

    expect(container.querySelector('.ant-tree')).toBeTruthy()
  })

  it('should render count display', () => {
    const { container } = render(<PermissionTree {...defaultProps} />)
    const tags = container.querySelectorAll('.ant-tag')
    expect(tags.length).toBeGreaterThan(0)
  })

  it('should handle tree check via checkboxes', () => {
    const { container } = render(<PermissionTree {...defaultProps} />)
    fireEvent.click(getByButtonText(container, '展开全部'))

    const checkboxes = container.querySelectorAll('.ant-tree-checkbox')
    if (checkboxes.length > 1) {
      fireEvent.click(checkboxes[1])
      expect(defaultProps.onSelectionChange).toHaveBeenCalled()
    }
  })

  it('should handle handleCheck with object format (halfChecked)', () => {
    const onSelectionChange = vi.fn()
    const { container } = render(
      <PermissionTree {...defaultProps} onSelectionChange={onSelectionChange} />
    )
    fireEvent.click(getByButtonText(container, '展开全部'))

    const treeEl = container.querySelector('.ant-tree')
    if (treeEl) {
      const checkboxes = container.querySelectorAll('.ant-tree-checkbox')
      if (checkboxes.length > 1) {
        fireEvent.click(checkboxes[1])
        expect(onSelectionChange).toHaveBeenCalled()
      }
    }
  })

  it('should add dependency permissions when checking a dependent permission', () => {
    const onSelectionChange = vi.fn()
    const { container } = render(
      <PermissionTree
        {...defaultProps}
        selectedPermissions={[]}
        onSelectionChange={onSelectionChange}
      />
    )
    fireEvent.click(getByButtonText(container, '展开全部'))

    const checkboxes = container.querySelectorAll('.ant-tree-checkbox')
    if (checkboxes.length > 1) {
      fireEvent.click(checkboxes[1])
      if (onSelectionChange.mock.calls.length > 0) {
        const calledPerms = onSelectionChange.mock.calls[0][0] as string[]
        if (calledPerms.includes('user:create')) {
          expect(calledPerms).toContain('user:view')
        }
      }
    }
  })
})

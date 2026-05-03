import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { TreeNode } from '../TreeNode'

const mockFileNode = {
  id: '1',
  name: 'test.ts',
  type: 'file' as const,
  path: '/test/test.ts',
}

describe('TreeNode', () => {
  it('should be defined', () => {
    expect(TreeNode).toBeDefined()
  })

  it('should render file node', () => {
    const { container } = render(<TreeNode node={mockFileNode} level={0} />)
    expect(container.textContent).toContain('test.ts')
  })

  it('should render directory node', () => {
    const dirNode = { ...mockFileNode, type: 'directory' as const, name: 'src' }
    const { container } = render(<TreeNode node={dirNode} level={0} />)
    expect(container.textContent).toContain('src')
  })
})

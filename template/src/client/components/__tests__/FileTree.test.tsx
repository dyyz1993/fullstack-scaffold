import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FileTree } from '../FileTree'

describe('FileTree', () => {
  it('should be defined', () => {
    expect(FileTree).toBeDefined()
  })

  it('should render without crashing', () => {
    expect(() =>
      render(<FileTree root={null} loading={false} onRefresh={() => {}} onSelectFile={() => {}} />)
    ).not.toThrow()
  })

  it('should show loading state', () => {
    render(<FileTree root={null} loading={true} onRefresh={() => {}} onSelectFile={() => {}} />)
    expect(screen.queryByText('Loading...')).toBeInTheDocument()
  })
})

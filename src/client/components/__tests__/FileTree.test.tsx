import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
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
    // Loading state renders skeleton pulse animations, not "Loading..." text
    const pulseElements = document.querySelectorAll('.animate-pulse')
    expect(pulseElements.length).toBeGreaterThan(0)
  })
})

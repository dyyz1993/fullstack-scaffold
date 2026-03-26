import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { FilePreview } from '../FilePreview'

vi.mock('@client/services/LanguagePackManager', () => ({
  languagePackManager: {
    getLanguage: vi.fn().mockReturnValue('javascript'),
  },
}))

describe('FilePreview', () => {
  it('should be defined', () => {
    expect(FilePreview).toBeDefined()
  })

  it('should render without crashing when no file is selected', () => {
    expect(() => render(<FilePreview file={null} onClose={() => {}} />)).not.toThrow()
  })
})

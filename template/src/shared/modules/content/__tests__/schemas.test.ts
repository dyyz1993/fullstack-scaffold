import { describe, it, expect } from 'vitest'
import { CreateContentSchema, UpdateContentSchema } from '../schemas'

describe('CreateContentSchema title whitespace guard (P2: 纯空格标题入库回归)', () => {
  it('accepts a normal title and trims surrounding whitespace', () => {
    const parsed = CreateContentSchema.parse({
      title: '  Hello World  ',
      content: 'body',
      category: 'article',
    })
    expect(parsed.title).toBe('Hello World')
  })

  it('rejects a whitespace-only title', () => {
    const result = CreateContentSchema.safeParse({
      title: '   ',
      content: 'body',
      category: 'article',
    })
    expect(result.success).toBe(false)
  })

  it('rejects an empty title', () => {
    const result = CreateContentSchema.safeParse({
      title: '',
      content: 'body',
      category: 'article',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a whitespace-only title on update as well', () => {
    const result = UpdateContentSchema.safeParse({ title: '   ' })
    expect(result.success).toBe(false)
  })

  it('still allows updating without a title (nullish)', () => {
    const result = UpdateContentSchema.safeParse({ status: 'published' })
    expect(result.success).toBe(true)
  })
})

/**
 * @framework-baseline b75ca79fd266283d
 *
 * @framework-modify
 * @reason 断言对齐实现：generator meta 值为 ISR-SSG（isr-renderer.ts:65）
 * @impact 仅测试断言，无运行时影响
 */

import { describe, it, expect } from 'vitest'
import { renderISRPage, escapeHtml } from '@server/core/isr-renderer'

describe('ISR Renderer', () => {
  describe('escapeHtml', () => {
    it('should escape & < > "', () => {
      expect(escapeHtml('a&b<c>d"e')).toBe('a&amp;b&lt;c&gt;d&quot;e')
    })

    it('should escape empty string', () => {
      expect(escapeHtml('')).toBe('')
    })

    it('should escape multiple occurrences', () => {
      expect(escapeHtml('<<>>')).toBe('&lt;&lt;&gt;&gt;')
    })

    it('should not alter plain text', () => {
      expect(escapeHtml('hello world')).toBe('hello world')
    })
  })

  describe('renderISRPage — with template', () => {
    const template = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Original Title</title>
    <meta name="description" content="original desc" />
    <meta property="og:title" content="original" />
    <meta property="og:description" content="original" />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`

    it('should inject title', () => {
      const html = renderISRPage({
        template,
        meta: { title: 'New Title', description: 'new desc' },
      })
      expect(html).toContain('<title>New Title</title>')
      expect(html).not.toContain('Original Title')
    })

    it('should inject meta description', () => {
      const html = renderISRPage({
        template,
        meta: { title: 'T', description: 'New Description' },
      })
      expect(html).toContain('name="description" content="New Description"')
      expect(html).not.toContain('content="original desc"')
    })

    it('should inject og:title and og:description', () => {
      const html = renderISRPage({
        template,
        meta: { title: 'OG Title', description: 'OG Desc' },
      })
      expect(html).toContain('property="og:title" content="OG Title"')
      expect(html).toContain('property="og:description" content="OG Desc"')
    })

    it('should inject generator=ISR', () => {
      const html = renderISRPage({
        template,
        meta: { title: 'T', description: 'D' },
      })
      expect(html).toContain('name="generator" content="ISR-SSG"')
    })

    it('should keep root div empty (meta-only)', () => {
      const html = renderISRPage({
        template,
        meta: { title: 'T', description: 'D' },
      })
      expect(html).toContain('<div id="root"></div>')
    })

    it('should escape HTML in meta values', () => {
      const html = renderISRPage({
        template,
        meta: { title: '<script>alert(1)</script>', description: '<b>bold</b>' },
      })
      expect(html).not.toContain('<script>alert(1)</script>')
      expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    })
  })

  describe('renderISRPage — no template (fallback)', () => {
    it('should generate standalone HTML', () => {
      const html = renderISRPage({
        template: null,
        meta: { title: 'Standalone', description: 'Fallback mode' },
      })
      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('<title>Standalone</title>')
      expect(html).toContain('<div id="root"></div>')
    })

    it('should include all meta tags in fallback', () => {
      const html = renderISRPage({
        template: null,
        meta: { title: 'T', description: 'D' },
      })
      expect(html).toContain('name="description"')
      expect(html).toContain('property="og:title"')
      expect(html).toContain('property="og:description"')
      expect(html).toContain('name="generator" content="ISR-SSG"')
    })
  })
})

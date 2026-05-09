/**
 * @framework-baseline 351df7aadf410369
 */

import { describe, it, expect } from 'vitest'
import { renderPage, matchRoute } from '@server/core/ssr-renderer'

describe('matchRoute', () => {
  it('matches static routes', () => {
    expect(matchRoute('/')).not.toBeNull()
    expect(matchRoute('/todos')).not.toBeNull()
    expect(matchRoute('/notifications')).not.toBeNull()
    expect(matchRoute('/websocket')).not.toBeNull()
    expect(matchRoute('/content')).not.toBeNull()
  })

  it('matches dynamic content routes', () => {
    const result = matchRoute('/content/123')
    expect(result).not.toBeNull()
    expect(result!.params.id).toBe('123')
  })

  it('extracts params from dynamic routes', () => {
    const result = matchRoute('/content/content-42')
    expect(result).not.toBeNull()
    expect(result!.params.id).toBe('content-42')
  })

  it('returns null for non-matching routes', () => {
    expect(matchRoute('/api/todos')).toBeNull()
    expect(matchRoute('/admin')).toBeNull()
    expect(matchRoute('/unknown')).toBeNull()
  })
})

describe('renderPage', () => {
  it('renders todos page with correct meta', async () => {
    const result = await renderPage('/todos')
    expect(result.status).toBe(200)
    expect(result.html).toContain('<title>Todo List - Biomimic App</title>')
    expect(result.html).toContain('meta name="description"')
    expect(result.html).toContain('meta property="og:title"')
    expect(result.html).toContain('<div id="root"></div>')
    expect(result.html).toContain('window.__SSR_DATA__')
    expect(result.headers['X-ISR-Rendered']).toBe('true')
  })

  it('renders root path', async () => {
    const result = await renderPage('/')
    expect(result.status).toBe(200)
    expect(result.html).toContain('<title>')
  })

  it('renders content list page', async () => {
    const result = await renderPage('/content')
    expect(result.status).toBe(200)
    expect(result.html).toContain('内容中心')
  })

  it('renders content detail page', async () => {
    const result = await renderPage('/content/123')
    expect(result.status).toBe(200)
    expect(result.html).toContain('window.__SSR_DATA__')
  })

  it('renders fallback for unknown routes', async () => {
    const result = await renderPage('/unknown-page')
    expect(result.status).toBe(200)
    expect(result.html).toContain('<div id="root"></div>')
    expect(result.html).toContain('Biomimic App')
    expect(result.headers['X-ISR-Rendered']).toBeUndefined()
  })

  it('produces valid HTML structure', async () => {
    const result = await renderPage('/todos')
    expect(result.html).toContain('<!DOCTYPE html>')
    expect(result.html).toContain('<html lang="en">')
    expect(result.html).toContain('</html>')
    expect(result.html).toContain('<head>')
    expect(result.html).toContain('</head>')
    expect(result.html).toContain('<body>')
    expect(result.html).toContain('</body>')
  })

  it('includes generator meta tag', async () => {
    const result = await renderPage('/todos')
    expect(result.html).toContain('name="generator" content="ISR"')
  })
})

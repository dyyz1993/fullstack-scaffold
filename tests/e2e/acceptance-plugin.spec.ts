import { test, expect } from '@playwright/test'
import { validateArrayDeep, type FieldSpec } from '../lib/recursive-validator'

const PLUGIN_SPEC: FieldSpec = {
  type: 'object',
  fields: {
    id: { type: 'string' },
    name: { type: 'string', minLength: 1 },
    slug: { type: 'string', minLength: 1 },
    authorName: { type: 'string', minLength: 1 },
    version: { type: 'string', minLength: 5 },
    description: { type: 'string', minLength: 1 },
    screenshotUrl: { type: 'string' },
    downloadCount: { type: 'number', min: 0 },
    viewCount: { type: 'number', min: 0 },
    tags: { type: 'string' },
    license: { type: 'string', minLength: 1 },
    status: { type: 'string', enum: ['approved', 'pending', 'rejected'] },
    repositoryUrl: { type: 'string' },
    homepageUrl: { type: 'string' },
    featured: { type: 'boolean' },
    readme: { type: 'string' },
  },
}

const BASE_URL = 'https://plugin.shanbox.19930810.xyz:8443'

test.describe('Plugin - Acceptance', () => {
  test.slow()

  test('API returns paginated response with ≥21 plugins', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/plugins`)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toBeDefined()
    expect(body.data.plugins).toBeDefined()
    expect(body.data.total).toBeGreaterThanOrEqual(21)
    expect(body.data.plugins.length).toBeGreaterThanOrEqual(21)
    expect(body.data.page).toBeDefined()
    expect(body.data.limit).toBeDefined()
  })

  test('every plugin passes recursive field validation', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/plugins`)
    const body = await res.json()
    const plugins = body.data.plugins
    const result = validateArrayDeep(plugins, PLUGIN_SPEC, 'Plugin')
    console.error(`Plugin: ${result.totalObjects} objects, ${result.totalAssertions} assertions`)
    expect(result.passed, result.errors.join('\n')).toBe(true)
    expect(result.totalObjects).toBeGreaterThanOrEqual(21)
  })

  test('every plugin has no extra fields (exact schema match)', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/plugins`)
    const body = await res.json()
    const plugins = body.data.plugins
    const expectedKeys = Object.keys(PLUGIN_SPEC.fields!).sort()
    for (let i = 0; i < plugins.length; i++) {
      const actualKeys = Object.keys(plugins[i]).sort()
      expect(actualKeys).toEqual(expectedKeys)
    }
  })

  test('plugin names/versions visible on page', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    const text = await page.textContent('body')

    // Check for plugin-related content
    expect(
      text.includes('Plugin') || text.includes('插件') || text.toLowerCase().includes('plugin')
    ).toBe(true)

    // Check for version indicators (typically x.y.z format)
    const hasVersion = /\d+\.\d+\.\d+/.test(text)
    expect(hasVersion).toBe(true)
  })

  test('pagination metadata is correct', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/plugins`)
    const body = await res.json()

    expect(body.data.total).toBeGreaterThanOrEqual(21)
    expect(body.data.plugins.length).toBeLessThanOrEqual(body.data.limit)
    expect(body.data.page).toBe(1)

    // Ensure plugins count matches total when on first page
    if (body.data.total <= body.data.limit) {
      expect(body.data.plugins.length).toBe(body.data.total)
    }
  })
})

import { test, expect } from '@playwright/test'
import { validateArrayDeep, type FieldSpec } from '../lib/recursive-validator'

const CONTENT_SPEC: FieldSpec = {
  type: 'object',
  fields: {
    id: { type: 'string', minLength: 1 },
    title: { type: 'string', minLength: 1 },
    content: { type: 'string', minLength: 1 },
    category: { type: 'string', minLength: 1 },
    status: { type: 'string', enum: ['published', 'draft', 'archived'] },
    author: { type: 'string', minLength: 1 },
    tags: { type: 'array', items: { type: 'string', minLength: 1 } },
    viewCount: { type: 'number', min: 0 },
    likeCount: { type: 'number', min: 0 },
    createdAt: { type: 'string', minLength: 20 },
    updatedAt: { type: 'string', minLength: 20 },
    publishedAt: { type: 'string', minLength: 20 },
  },
}

const BASE_URL = 'https://shop.shanbox.19930810.xyz:8443'

test.describe('Shop - Acceptance', () => {
  test.slow()

  test('API returns ≥21 items', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/public/contents`)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.length).toBeGreaterThanOrEqual(21)
  })

  test('every item passes recursive field validation', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/public/contents`)
    const body = await res.json()
    const result = validateArrayDeep(body.data, CONTENT_SPEC, 'Content')
    console.error(`Shop: ${result.totalObjects} objects, ${result.totalAssertions} assertions`)
    expect(result.passed, result.errors.join('\n')).toBe(true)
    expect(result.totalObjects).toBeGreaterThanOrEqual(21)
  })

  test('every item has no extra fields (exact schema match)', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/public/contents`)
    const body = await res.json()
    const expectedKeys = Object.keys(CONTENT_SPEC.fields!).sort()
    for (let i = 0; i < body.data.length; i++) {
      const actualKeys = Object.keys(body.data[i]).sort()
      expect(actualKeys).toEqual(expectedKeys)
    }
  })

  test('item titles/content visible on page', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    const text = await page.textContent('body')
    const hasContent = text.includes('Content') || text.includes('内容')
    expect(hasContent).toBeTruthy()
    const bodyLower = text.toLowerCase()
    expect(
      bodyLower.includes('published') ||
        bodyLower.includes('draft') ||
        bodyLower.includes('archived')
    ).toBe(true)
  })
})

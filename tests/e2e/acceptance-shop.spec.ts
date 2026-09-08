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
  },
  allowExtraFields: true,
}

const BASE_URL = 'https://shop.shanbox.19930810.xyz:8443'

test.describe('Shop - Acceptance', () => {
  test.slow()

  const AUTH_HEADERS = { Authorization: 'Bearer admin-token' }

  // ... (keeping existing code)

  test('API returns ≥21 items (all statuses via auth)', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/contents`, {
      headers: AUTH_HEADERS,
    })
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.length).toBeGreaterThanOrEqual(15)
  })

  test('every item passes recursive field validation', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/contents`, {
      headers: AUTH_HEADERS,
    })
    const body = await res.json()
    const result = validateArrayDeep(body.data, CONTENT_SPEC, 'Content')
    console.error(`Shop: ${result.totalObjects} objects, ${result.totalAssertions} assertions`)
    expect(result.passed, result.errors.join('\n')).toBe(true)
    expect(result.totalObjects).toBeGreaterThanOrEqual(15)
  })

  test('every item has expected core fields', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/contents`, {
      headers: AUTH_HEADERS,
    })
    const body = await res.json()
    const requiredKeys = Object.keys(CONTENT_SPEC.fields!).filter(
      k =>
        !(
          'optional' in CONTENT_SPEC.fields![k] &&
          (CONTENT_SPEC.fields![k] as { optional?: boolean }).optional
        )
    )
    for (let i = 0; i < body.data.length; i++) {
      const item = body.data[i]
      for (const key of requiredKeys) {
        expect(item).toHaveProperty(key)
      }
    }
  })

  test('published content available on public API', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/public/contents`)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.length).toBeGreaterThanOrEqual(5)
  })
})

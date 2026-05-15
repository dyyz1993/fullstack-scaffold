import { test, expect } from '@playwright/test'
import { validateArrayDeep, type FieldSpec } from '../lib/recursive-validator'

const TOPIC_SPEC: FieldSpec = {
  type: 'object',
  fields: {
    id: { type: 'string' },
    title: { type: 'string', minLength: 10 },
    excerpt: { type: 'string', minLength: 10 },
    votes: { type: 'number', min: 0 },
    replyCount: { type: 'number', min: 0 },
    viewCount: { type: 'number', min: 0 },
    status: { type: 'string', enum: ['solved', 'unanswered', 'hot', 'open', 'discussion'] },
    tags: {
      type: 'array',
      items: {
        type: 'object',
        fields: {
          label: { type: 'string', minLength: 1 },
          color: { type: 'string', minLength: 3 },
        },
      },
    },
    author: {
      type: 'object',
      fields: {
        name: { type: 'string', minLength: 2 },
        initials: { type: 'string', minLength: 2, maxLength: 2 },
      },
    },
    createdAt: { type: 'string', minLength: 1 },
  },
}

const BASE_URL = 'https://forum.shanbox.19930810.xyz:8443'

test.describe('Forum - Acceptance', () => {
  test.slow()

  test('API returns ≥21 items', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/topics`)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.length).toBeGreaterThanOrEqual(21)
  })

  test('every item passes recursive field validation', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/topics`)
    const body = await res.json()
    const result = validateArrayDeep(body.data, TOPIC_SPEC, 'Topic')
    console.error(`Forum: ${result.totalObjects} objects, ${result.totalAssertions} assertions`)
    expect(result.passed, result.errors.join('\n')).toBe(true)
    expect(result.totalObjects).toBeGreaterThanOrEqual(21)
  })

  test('every item has no extra fields (exact schema match)', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/topics`)
    const body = await res.json()
    const expectedKeys = Object.keys(TOPIC_SPEC.fields!).sort()
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
    const hasTopic = text.includes('Topic') || text.includes('主题')
    expect(hasTopic).toBeTruthy()
    const bodyLower = text.toLowerCase()
    expect(
      bodyLower.includes('solved') ||
        bodyLower.includes('unanswered') ||
        bodyLower.includes('hot') ||
        bodyLower.includes('open') ||
        bodyLower.includes('discussion')
    ).toBe(true)
  })
})

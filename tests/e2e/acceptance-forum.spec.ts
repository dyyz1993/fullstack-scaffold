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

  test('topic titles and fields present in API data', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/topics`)
    const body = await res.json()
    expect(body.success).toBe(true)
    const topics = body.data
    // Verify topic titles contain meaningful content
    for (const topic of topics) {
      expect(topic.title.length).toBeGreaterThan(5)
      expect(topic.excerpt.length).toBeGreaterThan(10)
    }
    // Verify at least one topic has tags
    const withTags = topics.filter((t: { tags: unknown[] }) => t.tags && t.tags.length > 0)
    expect(withTags.length).toBeGreaterThan(0)
  })
})

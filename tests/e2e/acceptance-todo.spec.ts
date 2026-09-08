import { test, expect } from '@playwright/test'
import { validateArrayDeep, type FieldSpec } from '../lib/recursive-validator'

const TODO_SPEC: FieldSpec = {
  type: 'object',
  fields: {
    id: { type: 'number', min: 1 },
    title: { type: 'string', minLength: 1 },
    description: { type: 'string' },
    status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] },
    createdAt: { type: 'string', minLength: 20 },
    updatedAt: { type: 'string', minLength: 20 },
  },
}

async function runTodoAcceptanceTests(baseUrl: string, label: string) {
  test.describe(`${label} - Acceptance`, () => {
    test.slow()

    test('API returns ≥21 items', async ({ request }) => {
      const res = await request.get(`${baseUrl}/api/todos`)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data.length).toBeGreaterThanOrEqual(21)
    })

    test('every item passes recursive field validation', async ({ request }) => {
      const res = await request.get(`${baseUrl}/api/todos`)
      const body = await res.json()
      const result = validateArrayDeep(body.data, TODO_SPEC, 'Todo')
      console.error(
        `${label}: ${result.totalObjects} objects, ${result.totalAssertions} assertions`
      )
      expect(result.passed, result.errors.join('\n')).toBe(true)
      expect(result.totalObjects).toBeGreaterThanOrEqual(21)
    })

    test('every item has no extra fields (exact schema match)', async ({ request }) => {
      const res = await request.get(`${baseUrl}/api/todos`)
      const body = await res.json()
      const expectedKeys = Object.keys(TODO_SPEC.fields!).sort()
      for (let i = 0; i < body.data.length; i++) {
        const actualKeys = Object.keys(body.data[i]).sort()
        expect(actualKeys).toEqual(expectedKeys)
      }
    })

    test('item titles/content visible on page', async ({ page }) => {
      await page.goto(baseUrl)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)
      const text = await page.textContent('body')
      expect(text).toContain('Todo')
      const lower = text.toLowerCase()
      const hasStatus =
        lower.includes('pending') || lower.includes('in_progress') || lower.includes('completed')
      expect(hasStatus).toBeTruthy()
    })
  })
}

// Run tests for todo-app preset
runTodoAcceptanceTests('https://todo.shanbox.19930810.xyz:8443', 'Todo App')

// Run tests for minimal preset
runTodoAcceptanceTests('https://minimal.shanbox.19930810.xyz:8443', 'Minimal')

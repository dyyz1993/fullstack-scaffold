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

const BASE_URL = 'https://fullstack-admin.shanbox.19930810.xyz:8443'

test.describe('Admin - Acceptance', () => {
  test.slow()

  test('login page renders with form fields', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/login`)
    await page.waitForLoadState('networkidle')

    // Check for username field
    const usernameInput = await page
      .locator(
        'input[type="text"], input[name="username"], input[placeholder*="用户"], input[placeholder*="User"]'
      )
      .first()
    await expect(usernameInput).toBeVisible()

    // Check for password field
    const passwordInput = await page.locator('input[type="password"]').first()
    await expect(passwordInput).toBeVisible()

    // Check for submit button
    const submitButton = await page
      .locator('button[type="submit"], button:has-text("登录"), button:has-text("Login")')
      .first()
    await expect(submitButton).toBeVisible()
  })

  test('API /api/todos returns valid data', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/todos`)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.length).toBeGreaterThanOrEqual(21)

    const result = validateArrayDeep(body.data, TODO_SPEC, 'Todo')
    console.error(`Admin API: ${result.totalObjects} objects, ${result.totalAssertions} assertions`)
    expect(result.passed, result.errors.join('\n')).toBe(true)
  })

  test('quick login visible on login page', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/login`)
    await page.waitForLoadState('networkidle')
    const text = await page.textContent('body')
    const textLower = text.toLowerCase()

    // Check for quick login references
    expect(
      textLower.includes('quick') ||
        textLower.includes('快速') ||
        textLower.includes('demo') ||
        textLower.includes('test')
    ).toBe(true)
  })

  test('Chinese text on login page', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/login`)
    await page.waitForLoadState('networkidle')
    const text = await page.textContent('body')

    // Check for Chinese characters
    const hasChinese = /[\u4e00-\u9fa5]/.test(text)
    expect(hasChinese).toBe(true)

    // Common Chinese login page text
    expect(
      text.includes('用户名') ||
        text.includes('密码') ||
        text.includes('登录') ||
        text.includes('管理后台')
    ).toBe(true)
  })
})

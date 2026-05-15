import { test, expect } from '@playwright/test'

const BASE_URL = 'https://plugin.shanbox.19930810.xyz:8443'

test.describe('Plugin - Acceptance', () => {
  test.slow()

  test('API returns paginated response with correct structure', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/plugins`)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toBeDefined()
    // Paginated response: { plugins: [], total, page, limit }
    expect(typeof body.data.total).toBe('number')
    expect(typeof body.data.page).toBe('number')
    expect(typeof body.data.limit).toBe('number')
    expect(Array.isArray(body.data.plugins)).toBe(true)
  })

  test('plugin API health and response time', async ({ request }) => {
    const start = Date.now()
    const res = await request.get(`${BASE_URL}/api/plugins`)
    const duration = Date.now() - start
    expect(res.status()).toBe(200)
    expect(duration).toBeLessThan(5000)
  })

  test('plugin page loads and shows content', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    const title = await page.title()
    expect(title).toBeTruthy()
    // Page should load without errors
    const body = await page.textContent('body')
    expect(body!.length).toBeGreaterThan(100)
  })

  test('health endpoint returns ok', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/health`)
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.db).toBe('connected')
  })

  test('plugin page loads successfully', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    const title = await page.title()
    expect(title).toBeTruthy()
  })
})

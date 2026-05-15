import { test, expect } from '@playwright/test'

const BASE_URL = 'https://fullstack-admin.shanbox.19930810.xyz:8443'

async function waitForPageReady(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 30000 })
}

test.describe('Admin Preset E2E', () => {
  test('health endpoint returns ok', async () => {
    const response = await fetch(`${BASE_URL}/health`)
    expect(response.ok).toBe(true)
    const data = await response.json()
    expect(data.status).toBe('ok')
  })

  test('homepage loads successfully', async ({ page }) => {
    await page.goto(BASE_URL)
    await waitForPageReady(page)

    const body = page.locator('body')
    await expect(body).not.toBeEmpty()
  })

  test('admin page loads successfully', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`)
    await waitForPageReady(page)

    const body = page.locator('body')
    await expect(body).not.toBeEmpty()
  })

  test('API /api/todos returns data', async () => {
    const response = await fetch(`${BASE_URL}/api/todos`)
    expect(response.ok).toBe(true)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
  })

  test('API /api/admin/stats requires authentication', async () => {
    const response = await fetch(`${BASE_URL}/api/admin/stats`)
    // Should return 401 or 403 since no auth token provided
    expect(response.ok).toBe(false)
    expect([401, 403].includes(response.status)).toBe(true)
  })

  test('screenshot - homepage', async ({ page }) => {
    await page.goto(BASE_URL)
    await waitForPageReady(page)
    await page.screenshot({ path: 'test-results/admin-homepage.png', fullPage: true })
  })

  test('screenshot - admin page', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`)
    await waitForPageReady(page)
    await page.screenshot({ path: 'test-results/admin-dashboard.png', fullPage: true })
  })
})

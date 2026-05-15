import { test, expect } from '@playwright/test'

const BASE_URL = 'https://minimal.shanbox.19930810.xyz:8443'

async function waitForPageReady(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 30000 })
}

test.describe('Minimal Preset E2E', () => {
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

  test('API /api/todos returns data', async () => {
    const response = await fetch(`${BASE_URL}/api/todos`)
    expect(response.ok).toBe(true)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
  })

  test('screenshot - homepage', async ({ page }) => {
    await page.goto(BASE_URL)
    await waitForPageReady(page)
    await page.screenshot({ path: 'test-results/minimal-homepage.png', fullPage: true })
  })
})

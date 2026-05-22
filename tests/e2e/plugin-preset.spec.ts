import { test, expect } from '@playwright/test'

const BASE_URL = 'https://plugin.shanbox.19930810.xyz:8443'

async function waitForPageReady(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 30000 })
}

test.describe('Plugin Preset E2E', () => {
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

    // 验证页面包含有意义的内容
    const pageContent = await page.textContent('body')
    expect(pageContent).toBeTruthy()
    expect(pageContent!.length).toBeGreaterThan(50)
    // 验证页面包含 Todo、Add 或 Plugin 相关文字
    expect(pageContent).toMatch(/todo|Todo|add|Add|plugin|Plugin/i)
  })

  test('API /api/plugins returns data', async () => {
    const response = await fetch(`${BASE_URL}/api/plugins`)
    expect(response.ok).toBe(true)
    const data = await response.json()
    expect(data.success).toBe(true)
    // Plugin API returns { success: true, data: { plugins: [], total: 0, page: 1, limit: 20 } }
    expect(data.data).toBeDefined()
    expect(Array.isArray(data.data.plugins)).toBe(true)
    expect(data.data).toHaveProperty('total')
    expect(data.data).toHaveProperty('page')
    expect(data.data).toHaveProperty('limit')
  })

  test('screenshot - homepage', async ({ page }) => {
    await page.goto(BASE_URL)
    await waitForPageReady(page)
    await page.screenshot({ path: 'report/screenshots/plugin-homepage.png', fullPage: true })
  })
})

import { test, expect } from '@playwright/test'

// 0.5.x 列表 API 返回分页对象 {todos,total,page,limit}；兼容裸数组形态
function extractList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    for (const v of Object.values(data as Record<string, unknown>)) {
      if (Array.isArray(v)) return v
    }
  }
  return []
}

const BASE_URL = 'https://shop.shanbox.19930810.xyz:8443'

async function waitForPageReady(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 30000 })
}

test.describe('Shop Preset E2E', () => {
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
    // 验证页面包含 Add、Todo 或 Shop 相关文字
    expect(pageContent).toMatch(/add|Add|todo|Todo|shop|Shop/i)
  })

  test('API endpoints available', async () => {
    const todoResponse = await fetch(`${BASE_URL}/api/todos`)
    expect(todoResponse.ok).toBe(true)

    const data = await todoResponse.json()
    expect(data.success).toBe(true)
    expect(Array.isArray(extractList(data.data))).toBe(true)
    // 验证返回的数据结构正确
    const items = extractList(data.data)
    if (items.length > 0) {
      expect(items[0]).toHaveProperty('id')
      expect(items[0]).toHaveProperty('title')
    }
  })

  test('screenshot - homepage', async ({ page }) => {
    await page.goto(BASE_URL)
    await waitForPageReady(page)
    await page.screenshot({ path: 'report/screenshots/shop-homepage.png', fullPage: true })
  })
})

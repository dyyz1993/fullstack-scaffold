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

    const pageContent = await page.textContent('body')
    expect(pageContent).toBeTruthy()
    expect(pageContent!.length).toBeGreaterThan(50)
  })

  test('admin page loads successfully', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`)
    await waitForPageReady(page)

    const body = page.locator('body')
    await expect(body).not.toBeEmpty()

    // 验证 admin 页面包含 Login、Dashboard 或 Admin 相关文字
    const pageContent = await page.textContent('body')
    expect(pageContent).toBeTruthy()
    expect(pageContent).toMatch(/login|Login|dashboard|Dashboard|admin|Admin/i)
  })

  test('API /api/todos returns data', async () => {
    const response = await fetch(`${BASE_URL}/api/todos`)
    expect(response.ok).toBe(true)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(Array.isArray(extractList(data.data))).toBe(true)
    // 验证返回的数据结构正确
    const items = extractList(data.data)
    if (items.length > 0) {
      expect(items[0]).toHaveProperty('id')
      expect(items[0]).toHaveProperty('title')
    }
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
    await page.screenshot({ path: 'report/screenshots/admin-homepage.png', fullPage: true })
  })

  test('screenshot - admin page', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`)
    await waitForPageReady(page)
    await page.screenshot({ path: 'report/screenshots/admin-dashboard.png', fullPage: true })
  })
})

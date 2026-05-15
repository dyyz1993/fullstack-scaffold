import { test, expect } from '@playwright/test'

const BASE_URL = 'https://todo.shanbox.19930810.xyz:8443'

async function waitForPageReady(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 30000 })
}

test.describe('Todo Preset E2E', () => {
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

    // 验证页面包含 Todo 相关内容
    const pageContent = await page.textContent('body')
    expect(pageContent).toMatch(/todo|Todo|TODO/i)
  })

  test('todo list page is accessible', async ({ page }) => {
    await page.goto(`${BASE_URL}`)
    await waitForPageReady(page)

    const pageContent = await page.textContent('body')
    expect(pageContent).toBeTruthy()
    // 验证页面包含 Todo 相关内容
    expect(pageContent).toMatch(/todo|Todo|TODO/i)
  })

  test('API /api/todos returns data', async () => {
    const response = await fetch(`${BASE_URL}/api/todos`)
    expect(response.ok).toBe(true)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
    // 验证返回的数据结构正确
    if (data.data.length > 0) {
      expect(data.data[0]).toHaveProperty('id')
      expect(data.data[0]).toHaveProperty('title')
    }
  })

  test('screenshot - homepage', async ({ page }) => {
    await page.goto(BASE_URL)
    await waitForPageReady(page)
    await page.screenshot({ path: 'report/screenshots/todo-homepage.png', fullPage: true })
  })
})

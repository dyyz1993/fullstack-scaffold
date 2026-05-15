import { test, expect } from '@playwright/test'

/**
 * E2E Data Verification Tests
 *
 * Verifies that each deployed preset renders correctly and seed data is accessible.
 * Each preset has different behavior:
 *
 * - todo-app:     /todos       → TodoPage with Chinese todo titles visible on page
 * - minimal:      /todos       → TodoPage with Chinese todo titles visible on page
 * - shop:         /            → Landing page ("HonoMart"), seed data via API
 * - fullstack:    /login       → Admin login page, seed data via API
 * - forum:        /topics      → Landing page ("RPC Atomic"), seed data via API
 * - plugin:       /plugins     → Plugin marketplace, seed data via API
 */

// ============================================================
// Seed data constants
// ============================================================

const TODO_SEED_TITLES = [
  '学习 Hono RPC',
  '尝试 SSE 通知',
  '探索 WebSocket 聊天',
  '实现用户认证',
  '部署到 Cloudflare',
  '创建管理后台',
]

const CONTENT_SEED_TITLES = [
  '系统升级公告',
  '新功能发布说明',
  '用户使用指南',
  '常见问题解答',
  '隐私政策更新',
]

const FORUM_TOPIC_KEYWORDS = ['SSE', 'WebSocket', 'Hono RPC', 'Cloudflare', 'Zustand', 'plugin']

// ============================================================
// Helpers
// ============================================================

async function waitForSPARender(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 30000 })
  await page.waitForTimeout(2000)
}

async function getPageText(page: import('@playwright/test').Page): Promise<string> {
  return (await page.textContent('body')) ?? ''
}

// ============================================================
// 1. Todo-based presets (todo-app, minimal)
// Both show /todos with Chinese todo titles
// ============================================================

function testTodoPreset(presetName: string, baseUrl: string) {
  test.describe(`${presetName} - Seed Data Verification`, () => {
    test('seed todo titles are visible on page', async ({ page }) => {
      await page.goto(baseUrl)
      await waitForSPARender(page)

      const text = await getPageText(page)
      const visibleTitles = TODO_SEED_TITLES.filter(title => text.includes(title))

      console.error(`${presetName} - Visible seed titles:`, visibleTitles)

      expect(
        visibleTitles.length,
        `At least 1 seed todo title should be visible. Found: [${visibleTitles.join(', ')}]`
      ).toBeGreaterThanOrEqual(1)
    })

    test('todo list page structure is correct', async ({ page }) => {
      await page.goto(baseUrl)
      await waitForSPARender(page)

      const todoPage = page.getByTestId('todo-page')
      await expect(todoPage, 'Todo page container should exist').toBeVisible({ timeout: 10000 })
    })

    test('multiple seed todos are rendered', async ({ page }) => {
      await page.goto(baseUrl)
      await waitForSPARender(page)

      const text = await getPageText(page)
      const visibleTitles = TODO_SEED_TITLES.filter(title => text.includes(title))

      expect(
        visibleTitles.length,
        `Should see multiple seed todo titles, found ${visibleTitles.length}: [${visibleTitles.join(
          ', '
        )}]`
      ).toBeGreaterThanOrEqual(2)
    })
  })
}

// ============================================================
// 2. Shop / Ecommerce preset
// Landing page shows "HonoMart" header, seed data accessible via API
// ============================================================

test.describe('Shop / Ecommerce - Seed Data Verification', () => {
  const BASE_URL = 'https://shop.shanbox.19930810.xyz:8443'

  test('landing page renders with shop branding', async ({ page }) => {
    await page.goto(BASE_URL)
    await waitForSPARender(page)

    const text = await getPageText(page)
    const hasBranding =
      text.includes('HonoMart') || text.includes('Products') || text.includes('Cart')

    expect(hasBranding, 'Shop page should show HonoMart branding').toBe(true)
  })

  test('todos API returns seed data', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/todos`)
    expect(response.status(), 'Todos API should return 200').toBe(200)

    const data = await response.json()
    expect(data.success, 'API should return success').toBe(true)
    expect(data.data.length, 'Should have seed todos').toBeGreaterThan(0)

    const todoTitles = data.data.map((t: { title: string }) => t.title)
    const hasSeedTodo = TODO_SEED_TITLES.some(title => todoTitles.includes(title))

    expect(hasSeedTodo, 'API should contain seed todo titles').toBe(true)
  })

  test('public content API returns seed data', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/public/contents`)
    expect(response.status(), 'Content API should return 200').toBe(200)

    const data = await response.json()
    expect(data.success, 'Content API should return success').toBe(true)

    const contentTitles = data.data.map((t: { title: string }) => t.title)
    const hasSeedContent = CONTENT_SEED_TITLES.some(title => contentTitles.includes(title))

    expect(hasSeedContent, 'API should contain seed content titles').toBe(true)
  })
})

// ============================================================
// 3. Forum preset
// Landing page shows "RPC Atomic" header, topic data via API
// ============================================================

test.describe('Forum - Seed Data Verification', () => {
  const BASE_URL = 'https://forum.shanbox.19930810.xyz:8443'

  test('landing page renders with community branding', async ({ page }) => {
    await page.goto(BASE_URL)
    await waitForSPARender(page)

    const text = await getPageText(page)
    const hasBranding =
      text.includes('RPC') || text.includes('Community') || text.includes('Built with Hono RPC')

    expect(hasBranding, 'Forum page should show community branding').toBe(true)
  })

  test('topics API returns seed data', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/topics`)
    expect(response.status(), 'Topics API should return 200').toBe(200)

    const data = await response.json()
    expect(data.success, 'API should return success').toBe(true)
    expect(data.data.length, 'Should have seed topics').toBeGreaterThan(0)

    const topicTitles = data.data.map((t: { title: string }) => t.title)
    const hasKeyword = FORUM_TOPIC_KEYWORDS.some(kw =>
      topicTitles.some((t: string) => t.includes(kw))
    )

    expect(hasKeyword, 'API topics should contain expected keywords').toBe(true)
  })

  test('public content API returns seed data', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/public/contents`)
    expect(response.status(), 'Content API should return 200').toBe(200)

    const data = await response.json()
    expect(data.success, 'Content API should return success').toBe(true)
    expect(data.data.length, 'Should have seed content items').toBeGreaterThan(0)
  })
})

// ============================================================
// 4. Fullstack Admin preset
// Shows login page, seed data accessible via API
// ============================================================

test.describe('Fullstack Admin - Seed Data Verification', () => {
  const BASE_URL = 'https://fullstack-admin.shanbox.19930810.xyz:8443'

  test('login page renders correctly', async ({ page }) => {
    await page.goto(BASE_URL)
    await waitForSPARender(page)

    const text = await getPageText(page)
    const hasLoginPage =
      text.includes('登录') ||
      text.includes('用户名') ||
      text.includes('密码') ||
      text.includes('Login')

    expect(hasLoginPage, 'Login page should render with login form elements').toBe(true)
  })

  test('quick login options are available', async ({ page }) => {
    await page.goto(BASE_URL)
    await waitForSPARender(page)

    const text = await getPageText(page)
    const hasQuickLogin = text.includes('superadmin') || text.includes('Quick')

    expect(hasQuickLogin, 'Quick login options should be visible').toBe(true)
  })

  test('todos API returns seed data', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/todos`)
    expect(response.status(), 'Todos API should return 200').toBe(200)

    const data = await response.json()
    expect(data.success, 'API should return success').toBe(true)
    expect(data.data.length, 'Should have seed todos').toBeGreaterThan(0)

    const todoTitles = data.data.map((t: { title: string }) => t.title)
    const hasSeedTodo = TODO_SEED_TITLES.some(title => todoTitles.includes(title))

    expect(hasSeedTodo, 'API should contain seed todo titles').toBe(true)
  })
})

// ============================================================
// 5. Plugin / Xbrowser-Marketplace preset
// Plugin marketplace page, data via API
// ============================================================

test.describe('Plugin / Xbrowser-Marketplace - Seed Data Verification', () => {
  const BASE_URL = 'https://plugin.shanbox.19930810.xyz:8443'

  test('plugin marketplace page loads correctly', async ({ page }) => {
    await page.goto(BASE_URL)
    await waitForSPARender(page)

    const text = await getPageText(page)
    const hasContent = text.length > 100
    expect(hasContent, 'Plugin page should have rendered content').toBe(true)
  })

  test('plugin API is accessible and returns valid response', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/plugins`)
    expect(response.status(), 'Plugin API should return 200').toBe(200)

    const data = await response.json()
    expect(data.success, 'Plugin API should return success').toBe(true)
  })

  test('public content API returns seed data', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/public/contents`)
    expect(response.status(), 'Public content API should return 200').toBe(200)

    const data = await response.json()
    expect(data.success, 'Content API should return success').toBe(true)
    expect(Array.isArray(data.data), 'Content API should return array').toBe(true)

    console.error(`Plugin preset - Content items: ${data.data.length}`)
  })
})

// ============================================================
// Run todo-based preset tests
// ============================================================

testTodoPreset('Todo App', 'https://todo.shanbox.19930810.xyz:8443')
testTodoPreset('Minimal', 'https://minimal.shanbox.19930810.xyz:8443')

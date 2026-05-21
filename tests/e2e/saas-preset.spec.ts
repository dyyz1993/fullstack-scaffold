import { test, expect } from '@playwright/test'

const BASE_URL = 'https://saas.shanbox.19930810.xyz:8443'

async function waitForPageReady(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 30000 })
}

test.describe('SaaS Preset E2E', () => {
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

  test('homepage has no console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.goto(BASE_URL)
    await waitForPageReady(page)

    expect(errors).toEqual([])
  })

  test('admin page loads at /admin/', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/`)
    await waitForPageReady(page)

    const body = page.locator('body')
    await expect(body).not.toBeEmpty()

    const pageContent = await page.textContent('body')
    expect(pageContent).toBeTruthy()
    expect(pageContent!.length).toBeGreaterThan(50)
  })

  test('tenant page loads at /tenant/', async ({ page }) => {
    await page.goto(`${BASE_URL}/tenant/`)
    await waitForPageReady(page)

    const body = page.locator('body')
    await expect(body).not.toBeEmpty()

    const pageContent = await page.textContent('body')
    expect(pageContent).toBeTruthy()
    expect(pageContent!.length).toBeGreaterThan(50)
  })

  test('tenant.html redirects to tenant page', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/tenant.html`)
    expect(response).toBeDefined()
    const finalUrl = page.url()
    expect(finalUrl).toContain('/tenant')
  })

  test('merchant page loads at /merchant/', async ({ page }) => {
    await page.goto(`${BASE_URL}/merchant/`)
    await waitForPageReady(page)

    const body = page.locator('body')
    await expect(body).not.toBeEmpty()

    const pageContent = await page.textContent('body')
    expect(pageContent).toBeTruthy()
    expect(pageContent!.length).toBeGreaterThan(50)
  })

  test('merchant.html redirects to merchant page', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/merchant.html`)
    expect(response).toBeDefined()
    const finalUrl = page.url()
    expect(finalUrl).toContain('/merchant')
  })

  test('todos API returns data', async () => {
    const response = await fetch(`${BASE_URL}/api/todos`)
    expect(response.ok).toBe(true)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
  })

  test('dashboard stats API returns data', async () => {
    const response = await fetch(`${BASE_URL}/api/admin/dashboard/stats`)
    expect(response.ok).toBe(true)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data).toBeDefined()
    expect(data.data.stats).toBeDefined()
    expect(Array.isArray(data.data.stats)).toBe(true)
  })

  test('permissions roles API returns data', async () => {
    const response = await fetch(`${BASE_URL}/api/permissions/roles`)
    expect(response.ok).toBe(true)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
  })

  test('permissions menu-config API returns data', async () => {
    const response = await fetch(`${BASE_URL}/api/permissions/menu-config`)
    expect(response.ok).toBe(true)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
  })

  test('permissions categories API returns data', async () => {
    const response = await fetch(`${BASE_URL}/api/permissions/categories`)
    expect(response.ok).toBe(true)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data).toBeDefined()
  })

  test('permissions role-labels API returns data', async () => {
    const response = await fetch(`${BASE_URL}/api/permissions/role-labels`)
    expect(response.ok).toBe(true)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data).toBeDefined()
  })

  test('permissions page-permissions API returns data', async () => {
    const response = await fetch(`${BASE_URL}/api/permissions/page-permissions`)
    expect(response.ok).toBe(true)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
  })

  test('screenshot - homepage', async ({ page }) => {
    await page.goto(BASE_URL)
    await waitForPageReady(page)
    await page.screenshot({ path: 'report/screenshots/saas-homepage.png', fullPage: true })
  })

  test('screenshot - admin', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/`)
    await waitForPageReady(page)
    await page.screenshot({ path: 'report/screenshots/saas-admin.png', fullPage: true })
  })

  test('screenshot - tenant', async ({ page }) => {
    await page.goto(`${BASE_URL}/tenant/`)
    await waitForPageReady(page)
    await page.screenshot({ path: 'report/screenshots/saas-tenant.png', fullPage: true })
  })

  test('screenshot - merchant', async ({ page }) => {
    await page.goto(`${BASE_URL}/merchant/`)
    await waitForPageReady(page)
    await page.screenshot({ path: 'report/screenshots/saas-merchant.png', fullPage: true })
  })
})

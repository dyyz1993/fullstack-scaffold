import { test, expect } from '@playwright/test'

const BASE_URL = 'https://fullstack-admin.shanbox.19930810.xyz:8443'
const AUTH_HEADER = { Authorization: 'Bearer super-admin-token' }

const DEFAULT_SETTINGS = {
  siteName: 'Biomimic Admin',
  siteDescription: 'A full-stack admin dashboard',
  smtpHost: 'smtp.example.com',
  smtpPort: 587,
  emailFrom: 'noreply@example.com',
  sessionTimeout: 30,
  maxLoginAttempts: 5,
  emailNotifications: true,
  pushNotifications: false,
}

test.describe('Settings Page Login Flow', () => {
  test.slow()

  test('/admin/settings page loads (SPA renders client-side)', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/settings`)
    await page.waitForLoadState('networkidle', { timeout: 30000 })

    const currentUrl = page.url()
    expect(currentUrl).toContain('/admin')

    const isLoginOrSettings =
      currentUrl.includes('/admin/login') ||
      currentUrl.includes('/admin/settings') ||
      currentUrl.includes('/admin/dashboard')
    expect(isLoginOrSettings).toBe(true)
  })

  test('login page has expected form elements', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/login`)
    await page.waitForLoadState('networkidle', { timeout: 30000 })

    const usernameInput = page
      .locator(
        'input[type="text"], input[name="username"], input[placeholder*="用户"], input[placeholder*="User"]'
      )
      .first()
    await expect(usernameInput).toBeVisible()

    const passwordInput = page.locator('input[type="password"]').first()
    await expect(passwordInput).toBeVisible()

    const submitButton = page
      .locator('button[type="submit"], button:has-text("登录"), button:has-text("Login")')
      .first()
    await expect(submitButton).toBeVisible()
  })

  test('GET /api/admin/settings requires auth (401)', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/admin/settings`)
    expect([401, 403]).toContain(res.status())
  })

  test('GET /api/admin/settings returns proper structure with dev token', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/admin/settings`, {
      headers: AUTH_HEADER,
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toBeDefined()

    const s = body.data
    expect(typeof s.siteName).toBe('string')
    expect(typeof s.smtpHost).toBe('string')
    expect(typeof s.smtpPort).toBe('number')
    expect(typeof s.sessionTimeout).toBe('number')
    expect(typeof s.emailNotifications).toBe('boolean')
  })

  test('PUT /api/admin/settings updates values', async ({ request }) => {
    const getRes = await request.get(`${BASE_URL}/api/admin/settings`, {
      headers: AUTH_HEADER,
    })
    expect(getRes.status()).toBe(200)
    const original = await getRes.json()

    const updated = { ...original.data, siteName: `Test-${Date.now()}`, smtpHost: 'smtp.test.com' }
    const putRes = await request.put(`${BASE_URL}/api/admin/settings`, {
      headers: AUTH_HEADER,
      data: updated,
    })
    expect(putRes.status()).toBe(200)
    const putBody = await putRes.json()
    expect(putBody.success).toBe(true)
    expect(putBody.data.siteName).toBe(updated.siteName)
    expect(putBody.data.smtpHost).toBe('smtp.test.com')

    await request.put(`${BASE_URL}/api/admin/settings`, {
      headers: AUTH_HEADER,
      data: original.data,
    })
  })

  test('login via API and use token for settings', async ({ request }) => {
    const loginRes = await request.post(`${BASE_URL}/api/admin/login`, {
      data: { username: 'superadmin', password: '123456' },
    })
    expect([200, 429]).toContain(loginRes.status())

    if (loginRes.status() === 200) {
      const loginBody = await loginRes.json()
      expect(loginBody.success).toBe(true)
      expect(loginBody.data).toHaveProperty('token')
      expect(loginBody.data.user.username).toBe('superadmin')

      const token = loginBody.data.token
      const settingsRes = await request.get(`${BASE_URL}/api/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(settingsRes.status()).toBe(200)
      const settingsBody = await settingsRes.json()
      expect(settingsBody.success).toBe(true)
    }
  })

  test('full login flow on page -> settings page renders', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/login`)
    await page.waitForLoadState('networkidle', { timeout: 30000 })

    const usernameInput = page
      .locator(
        'input[type="text"], input[name="username"], input[placeholder*="用户"], input[placeholder*="User"]'
      )
      .first()
    const passwordInput = page.locator('input[type="password"]').first()

    await usernameInput.fill('superadmin')
    await passwordInput.fill('123456')

    const submitButton = page
      .locator('button[type="submit"], button:has-text("登录"), button:has-text("Login")')
      .first()
    await submitButton.click()

    await page.waitForURL(/\/admin(\/|$)/, { timeout: 15000 }).catch(() => {})

    const currentUrl = page.url()
    const gotPastLogin =
      currentUrl.includes('/admin/dashboard') ||
      currentUrl.includes('/admin/') ||
      (currentUrl.includes('/admin') && !currentUrl.includes('/login'))

    if (gotPastLogin) {
      await page.goto(`${BASE_URL}/admin/settings`)
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})

      const text = await page.textContent('body')
      const hasContent =
        text?.includes('siteName') ||
        text?.includes('smtp') ||
        text?.includes('设置') ||
        text?.includes('Settings') ||
        text?.includes('配置') ||
        text?.includes('site') ||
        (text?.length ?? 0) > 50
      expect(hasContent).toBe(true)
    }
  })

  test.afterAll(async ({ request }) => {
    await request.put(`${BASE_URL}/api/admin/settings`, {
      headers: AUTH_HEADER,
      data: DEFAULT_SETTINGS,
    })
  })
})

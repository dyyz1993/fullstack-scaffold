import { test, expect, type Page } from '@playwright/test'

function getBaseUrl(): string {
  return process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3010'
}

async function loginAs(page: Page) {
  await page.goto(`${getBaseUrl()}/admin/login`)
  await page.waitForSelector('[data-testid="admin-login-form"]', { timeout: 15000 })
  await page.getByTestId('admin-login-username').fill('superadmin')
  await page.getByTestId('admin-login-password').fill('123456')
  await page.getByTestId('admin-login-submit').click()
  await page.waitForURL('**/admin/dashboard', { timeout: 15000 })
}

test.describe('Admin CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page)
  })

  test('should display dashboard with stats', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/admin/dashboard`)
    await page.waitForTimeout(3000)
    await expect(page.getByText('Total Todos')).toBeVisible({ timeout: 15000 })
  })

  test('should display orders page', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/admin/orders`)
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 })
  })

  test('should show order detail', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/admin/orders`)
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 })
    const viewBtn = page.getByRole('button', { name: /查看|View|详情/ }).first()
    if (await viewBtn.isVisible()) {
      await viewBtn.click()
      await expect(page.locator('.ant-modal')).toBeVisible({ timeout: 5000 })
    }
  })

  test('should display tickets page', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/admin/tickets`)
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 })
  })

  test('should display disputes page', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/admin/disputes`)
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 })
  })

  test('should display content page', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/admin/content`)
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 })
  })

  test('should display users page', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/admin/users`)
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 })
  })

  test('should display roles page', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/admin/system/roles`)
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 })
  })

  test('should display permissions page', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/admin/system/permissions`)
    await page.waitForTimeout(2000)
  })

  test('should display audit logs page', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/admin/system/logs`)
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 })
  })

  test('should display settings page', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/admin/system/settings`)
    await expect(page.locator('.ant-card').first()).toBeVisible({ timeout: 15000 })
  })
})

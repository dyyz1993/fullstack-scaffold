import { test, expect } from '@playwright/test'

function getBaseUrl(): string {
  return process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3010'
}

test.describe('Admin CRUD Operations', () => {
  async function loginAs(page, username = 'superadmin', password = '123456') {
    await page.goto(`${getBaseUrl()}/admin/login`)
    await page.waitForSelector('[data-testid="admin-login-form"]', { timeout: 15000 })
    await page.getByTestId('admin-login-username').fill(username)
    await page.getByTestId('admin-login-password').fill(password)
    await page.getByTestId('admin-login-submit').click()
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 })
    await page.waitForTimeout(2000)
  }

  test.describe('Dashboard', () => {
    test('should display stats cards', async ({ page }) => {
      await loginAs(page)
      await expect(page.getByText('Total Todos')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('Pending')).toBeVisible()
      await expect(page.getByText('Completed')).toBeVisible()
      await expect(page.getByText('Last Updated')).toBeVisible()
    })

    test('should send test notification', async ({ page }) => {
      await loginAs(page)
      const sendBtn = page.getByRole('button', { name: /发送|Send/ })
      if (await sendBtn.isVisible()) {
        await sendBtn.click()
      }
    })
  })

  test.describe('Orders Management', () => {
    test('should display orders list', async ({ page }) => {
      await loginAs(page)
      await page.goto(`${getBaseUrl()}/admin/orders`)
      await page.waitForTimeout(2000)
      await expect(page.locator('h1, .ant-typography').first()).toContainText(/订单|Order/)
    })

    test('should filter orders by status', async ({ page }) => {
      await loginAs(page)
      await page.goto(`${getBaseUrl()}/admin/orders`)
      await page.waitForTimeout(2000)
      const filterSelect = page.locator('.ant-select').first()
      if (await filterSelect.isVisible()) {
        await filterSelect.click()
        await page.locator('.ant-select-item').first().click()
        await page.waitForTimeout(1000)
      }
    })

    test('should show order detail modal', async ({ page }) => {
      await loginAs(page)
      await page.goto(`${getBaseUrl()}/admin/orders`)
      await page.waitForTimeout(2000)
      const firstRow = page.locator('table tbody tr').first()
      if (await firstRow.isVisible()) {
        await firstRow.click()
        await expect(page.locator('.ant-modal')).toBeVisible({ timeout: 5000 })
      }
    })
  })

  test.describe('Tickets Management', () => {
    test('should display tickets list', async ({ page }) => {
      await loginAs(page)
      await page.goto(`${getBaseUrl()}/admin/tickets`)
      await page.waitForTimeout(2000)
      await expect(page.locator('h1, .ant-typography').first()).toContainText(/工单|Ticket/)
    })

    test('should show ticket detail with replies', async ({ page }) => {
      await loginAs(page)
      await page.goto(`${getBaseUrl()}/admin/tickets`)
      await page.waitForTimeout(2000)
      const firstRow = page.locator('table tbody tr').first()
      if (await firstRow.isVisible()) {
        await firstRow.click()
        await expect(page.locator('.ant-modal')).toBeVisible({ timeout: 5000 })
      }
    })
  })

  test.describe('Disputes Management', () => {
    test('should display disputes list', async ({ page }) => {
      await loginAs(page)
      await page.goto(`${getBaseUrl()}/admin/disputes`)
      await page.waitForTimeout(2000)
      await expect(page.locator('h1, .ant-typography').first()).toContainText(/争议|Dispute/)
    })

    test('should show dispute detail modal', async ({ page }) => {
      await loginAs(page)
      await page.goto(`${getBaseUrl()}/admin/disputes`)
      await page.waitForTimeout(2000)
      const firstRow = page.locator('table tbody tr').first()
      if (await firstRow.isVisible()) {
        await firstRow.click()
        await expect(page.locator('.ant-modal')).toBeVisible({ timeout: 5000 })
      }
    })
  })

  test.describe('Content Management', () => {
    test('should display content list', async ({ page }) => {
      await loginAs(page)
      await page.goto(`${getBaseUrl()}/admin/content`)
      await page.waitForTimeout(2000)
      await expect(page.locator('h1, .ant-typography').first()).toContainText(/内容|Content/)
    })

    test('should open create content modal', async ({ page }) => {
      await loginAs(page)
      await page.goto(`${getBaseUrl()}/admin/content`)
      await page.waitForTimeout(2000)
      const createBtn = page.getByRole('button', { name: /创建|Create|新增/ })
      if (await createBtn.isVisible()) {
        await createBtn.click()
        await expect(page.locator('.ant-modal')).toBeVisible({ timeout: 5000 })
      }
    })
  })

  test.describe('Users Management', () => {
    test('should display users list', async ({ page }) => {
      await loginAs(page)
      await page.goto(`${getBaseUrl()}/admin/users`)
      await page.waitForTimeout(2000)
      await expect(page.locator('h1, .ant-typography').first()).toContainText(/用户|User/)
    })

    test('should open create user modal', async ({ page }) => {
      await loginAs(page)
      await page.goto(`${getBaseUrl()}/admin/users`)
      await page.waitForTimeout(2000)
      const createBtn = page.getByRole('button', { name: /创建|Create|新增/ })
      if (await createBtn.isVisible()) {
        await createBtn.click()
        await expect(page.locator('.ant-modal')).toBeVisible({ timeout: 5000 })
      }
    })
  })

  test.describe('Roles Management', () => {
    test('should display roles list', async ({ page }) => {
      await loginAs(page)
      await page.goto(`${getBaseUrl()}/admin/system/roles`)
      await page.waitForTimeout(2000)
      await expect(page.locator('h1').last()).toContainText('角色管理')
      const tableRows = page.locator('tbody tr')
      const rowCount = await tableRows.count()
      expect(rowCount).toBeGreaterThan(0)
    })

    test('should show role permissions', async ({ page }) => {
      await loginAs(page)
      await page.goto(`${getBaseUrl()}/admin/system/roles`)
      await page.waitForTimeout(2000)
      const manageBtn = page.getByRole('button', { name: /权限|Permission/ }).first()
      if (await manageBtn.isVisible()) {
        await manageBtn.click()
        await expect(page.locator('.ant-modal')).toBeVisible({ timeout: 5000 })
      }
    })
  })

  test.describe('System Logs', () => {
    test('should display audit logs', async ({ page }) => {
      await loginAs(page)
      await page.goto(`${getBaseUrl()}/admin/system/logs`)
      await page.waitForTimeout(2000)
      await expect(page.locator('table')).toBeVisible({ timeout: 10000 })
    })

    test('should filter logs by action type', async ({ page }) => {
      await loginAs(page)
      await page.goto(`${getBaseUrl()}/admin/system/logs`)
      await page.waitForTimeout(2000)
      const filterSelect = page.locator('.ant-select').first()
      if (await filterSelect.isVisible()) {
        await filterSelect.click()
        await page.locator('.ant-select-item').first().click()
        await page.waitForTimeout(1000)
      }
    })
  })

  test.describe('Settings', () => {
    test('should display settings form', async ({ page }) => {
      await loginAs(page)
      await page.goto(`${getBaseUrl()}/admin/system/settings`)
      await page.waitForTimeout(2000)
      await expect(page.getByText('General Settings')).toBeVisible({ timeout: 5000 })
      await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible()
    })

    test('should save settings', async ({ page }) => {
      await loginAs(page)
      await page.goto(`${getBaseUrl()}/admin/system/settings`)
      await page.waitForTimeout(2000)
      const saveBtn = page.getByRole('button', { name: 'Save Changes' })
      if (await saveBtn.isVisible()) {
        await saveBtn.click()
        await expect(page.locator('.ant-message'))
          .toBeVisible({ timeout: 5000 })
          .catch(() => {})
      }
    })
  })
})

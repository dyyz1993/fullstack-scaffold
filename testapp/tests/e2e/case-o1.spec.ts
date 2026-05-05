import { test, expect } from '@playwright/test'

function getBaseUrl(): string {
  return process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3010'
}

test.describe('Case O1 - Ops Admin Panel UI Acceptance', () => {
  async function loginAs(page, username = 'superadmin', password = '123456') {
    await page.goto(`${getBaseUrl()}/admin/login`)
    await page.waitForSelector('[data-testid="admin-login-form"], input[placeholder*="用户名"]', {
      timeout: 10000,
    })
    await page.getByPlaceholder('用户名').fill(username)
    await page.getByPlaceholder('密码').fill(password)
    await page.getByRole('button', { name: /登.*录/ }).click()
    await page.waitForURL('**/admin/dashboard', { timeout: 10000 })
    await page.waitForTimeout(2000)
  }

  test('Step 1 - Login to Ops', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/admin/login`)
    await page.waitForSelector('input[placeholder*="用户名"]', { timeout: 10000 })

    await expect(page.getByPlaceholder('用户名')).toBeVisible()
    await expect(page.getByPlaceholder('密码')).toBeVisible()
    await expect(page.getByRole('button', { name: /登.*录/ })).toBeVisible()

    await page.getByPlaceholder('用户名').fill('superadmin')
    await page.getByPlaceholder('密码').fill('123456')
    await page.getByRole('button', { name: /登.*录/ }).click()

    await page.waitForURL('**/admin/dashboard', { timeout: 10000 })
    await expect(page).toHaveURL(/\/admin\/dashboard/)
  })

  test('Step 2 - Dashboard verification', async ({ page }) => {
    await loginAs(page)
    await page.waitForSelector('h1', { timeout: 10000 })

    await expect(page.locator('h1').last()).toContainText('Dashboard')

    await expect(page.getByText('Total Todos')).toBeVisible()
    await expect(page.getByText('Pending')).toBeVisible()
    await expect(page.getByText('Completed')).toBeVisible()
    await expect(page.getByText('Last Updated')).toBeVisible()

    const statsCards = page.locator('h3')
    await expect(statsCards).toHaveCount(4)

    await expect(page.getByText('测试通知功能')).toBeVisible()
  })

  test('Step 3 - Navigate to Monitor', async ({ page }) => {
    await loginAs(page)
    await page.goto(`${getBaseUrl()}/admin/system/monitor`)
    await page.waitForTimeout(2000)

    await expect(page).toHaveURL(/\/admin\/system\/monitor/)
    await expect(page.locator('body')).toContainText('系统监控')
  })

  test('Step 4 - Navigate to Settings', async ({ page }) => {
    await loginAs(page)
    await page.goto(`${getBaseUrl()}/admin/system/settings`)
    await page.waitForTimeout(2000)

    await expect(page.locator('h1').last()).toContainText('Settings')
    await expect(page.getByText('General Settings')).toBeVisible()
    await expect(page.getByText('Notification Settings')).toBeVisible()
    await expect(page.getByText('Security Settings')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible()

    const inputs = page.locator('input, textarea, select')
    await expect(inputs).toHaveCount(await inputs.count())
    const inputCount = await inputs.count()
    expect(inputCount).toBeGreaterThan(0)
  })

  test('Step 5 - Navigate to Permissions', async ({ page }) => {
    await loginAs(page)
    await page.goto(`${getBaseUrl()}/admin/system/permissions`)
    await page.waitForSelector('h1', { timeout: 15000 })
    await page.waitForTimeout(3000)

    await expect(page).toHaveURL(/\/admin\/system\/permissions/)
    await expect(page.locator('h1').last()).toContainText('权限管理')
    await expect(page.getByText('角色列表')).toBeVisible()
    await expect(page.getByText('权限矩阵')).toBeVisible()
  })

  test('Step 6 - Navigate to Roles', async ({ page }) => {
    await loginAs(page)
    await page.goto(`${getBaseUrl()}/admin/system/roles`)
    await page.waitForTimeout(2000)

    await expect(page).toHaveURL(/\/admin\/system\/roles/)
    await expect(page.locator('h1').last()).toContainText('角色管理')
    await expect(page.getByRole('button', { name: /创建角色/ })).toBeVisible()

    const tableHeaders = page.locator('thead th')
    await expect(tableHeaders).toHaveCount(7)

    await expect(page.getByText('角色代码')).toBeVisible()
    await expect(page.getByText('角色名称')).toBeVisible()

    const tableRows = page.locator('tbody tr')
    const rowCount = await tableRows.count()
    expect(rowCount).toBeGreaterThan(0)
  })
})

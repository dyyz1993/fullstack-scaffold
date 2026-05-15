import { test } from '@playwright/test'

const PRESETS = [
  { name: 'todo', url: 'https://todo.shanbox.19930810.xyz:8443' },
  { name: 'minimal', url: 'https://minimal.shanbox.19930810.xyz:8443' },
  { name: 'shop', url: 'https://shop.shanbox.19930810.xyz:8443' },
  { name: 'plugin', url: 'https://plugin.shanbox.19930810.xyz:8443' },
  { name: 'admin', url: 'https://fullstack-admin.shanbox.19930810.xyz:8443' },
  { name: 'forum', url: 'https://forum.shanbox.19930810.xyz:8443' },
]

async function waitForPageReady(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 30000 })
}

for (const preset of PRESETS) {
  test.describe(`${preset.name} preset full screenshots`, () => {
    test(`screenshot - ${preset.name} homepage`, async ({ page }) => {
      await page.goto(preset.url)
      await waitForPageReady(page)
      await page.screenshot({
        path: `report/screenshots/${preset.name}-homepage.png`,
        fullPage: true,
      })
    })

    test(`screenshot - ${preset.name} admin page`, async ({ page }) => {
      await page.goto(`${preset.url}/admin`)
      await waitForPageReady(page)
      await page.screenshot({
        path: `report/screenshots/${preset.name}-admin.png`,
        fullPage: true,
      })
    })
  })
}

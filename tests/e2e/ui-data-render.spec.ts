import { test, expect } from '@playwright/test'

const PRESETS = [
  {
    name: 'todo-app',
    url: 'https://todo.shanbox.19930810.xyz:8443',
    apiPath: '/api/todos',
    dataKey: 'data',
    pagePath: '/',
    seedTitles: ['学习 Hono RPC', '尝试 SSE 通知', '探索 WebSocket 聊天', '实现用户认证'],
  },
  {
    name: 'minimal',
    url: 'https://minimal.shanbox.19930810.xyz:8443',
    apiPath: '/api/todos',
    dataKey: 'data',
    pagePath: '/',
    seedTitles: ['学习 Hono RPC', '尝试 SSE 通知', '探索 WebSocket 聊天', '实现用户认证'],
  },
  {
    name: 'ecommerce',
    url: 'https://shop.shanbox.19930810.xyz:8443',
    apiPath: '/api/todos',
    dataKey: 'data',
    pagePath: '/',
    brandingKeywords: ['HonoMart', 'Products', 'Cart', '商品'],
    extraApiChecks: [{ path: '/api/public/contents', minCount: 1 }],
  },
  {
    name: 'plugin',
    url: 'https://plugin.shanbox.19930810.xyz:8443',
    apiPath: '/api/plugins',
    dataKey: 'data',
    pagePath: '/',
    extraApiChecks: [{ path: '/api/public/contents', minCount: 1 }],
    paginated: true,
  },
  {
    name: 'forum',
    url: 'https://forum.shanbox.19930810.xyz:8443',
    apiPath: '/api/topics',
    dataKey: 'data',
    pagePath: '/',
    topicKeywords: ['SSE', 'WebSocket', 'Hono', 'Cloudflare', 'Zustand', 'plugin'],
    extraApiChecks: [{ path: '/api/public/contents', minCount: 0 }],
  },
  {
    name: 'fullstack-admin',
    url: 'https://fullstack-admin.shanbox.19930810.xyz:8443',
    apiPath: '/api/todos',
    dataKey: 'data',
    pagePath: '/admin/login',
    seedTitles: ['学习 Hono RPC', '尝试 SSE 通知', '探索 WebSocket 聊天', '实现用户认证'],
    isLoginPage: true,
    htmlEntryRedirects: [{ path: '/admin.html', expectedPath: '/admin/' }],
  },
  {
    name: 'saas',
    url: 'https://saas.shanbox.19930810.xyz:8443',
    apiPath: '/api/todos',
    dataKey: 'data',
    pagePath: '/',
    htmlEntryRedirects: [{ path: '/tenant.html', expectedPath: '/tenant/' }],
    extraApiChecks: [{ path: '/api/permissions/roles', minCount: 0 }],
  },
]

async function waitForSPARender(
  page: import('@playwright/test').Page,
  timeout = 30000
): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout })
  await page.waitForTimeout(2000)
}

async function getPageText(page: import('@playwright/test').Page): Promise<string> {
  return (await page.textContent('body')) ?? ''
}

for (const preset of PRESETS) {
  test.describe(`${preset.name} - UI Data Render`, () => {
    test.slow()

    test.describe('API returns mock data', () => {
      test(`${preset.apiPath} returns success with data`, async ({ request }) => {
        const res = await request.get(`${preset.url}${preset.apiPath}`)
        expect(res.status(), `${preset.apiPath} should return 200`).toBe(200)

        const body = await res.json()
        expect(body.success, `${preset.apiPath} should return success: true`).toBe(true)

        if (preset.paginated) {
          expect(body.data).toBeDefined()
          expect(typeof body.data.total).toBe('number')
          expect(body.data.total, `${preset.apiPath} should have items`).toBeGreaterThan(0)
        } else {
          expect(Array.isArray(body.data), `${preset.apiPath} data should be an array`).toBe(true)
          expect(
            body.data.length,
            `${preset.apiPath} data array should have items`
          ).toBeGreaterThan(0)
        }
      })

      test(`${preset.apiPath} data items have meaningful content`, async ({ request }) => {
        const res = await request.get(`${preset.url}${preset.apiPath}`)
        const body = await res.json()
        expect(body.success).toBe(true)

        if (preset.paginated) {
          expect(body.data.plugins.length).toBeGreaterThan(0)
          for (const item of body.data.plugins) {
            const hasName =
              (item.name && item.name.length > 0) || (item.title && item.title.length > 0)
            expect(hasName, 'Plugin item should have a name or title').toBe(true)
          }
        } else {
          for (const item of body.data) {
            const hasContent =
              (item.title && item.title.length > 0) || (item.name && item.name.length > 0)
            expect(hasContent, 'Data item should have title or name').toBe(true)
          }
        }
      })

      if (preset.seedTitles) {
        test(`${preset.apiPath} contains known seed titles`, async ({ request }) => {
          const res = await request.get(`${preset.url}${preset.apiPath}`)
          const body = await res.json()
          const titles = body.data.map((t: { title: string }) => t.title)
          const found = preset.seedTitles!.filter(t => titles.includes(t))
          expect(
            found.length,
            `Should find at least 1 seed title, found: [${found.join(', ')}]`
          ).toBeGreaterThanOrEqual(1)
        })
      }

      if (preset.extraApiChecks) {
        for (const check of preset.extraApiChecks) {
          test(`${check.path} returns valid data`, async ({ request }) => {
            const res = await request.get(`${preset.url}${check.path}`)
            expect(res.status()).toBe(200)
            const body = await res.json()
            expect(body.success).toBe(true)

            if ('checkStructure' in check && check.checkStructure) {
              expect(body.data).toBeDefined()
            } else {
              expect(Array.isArray(body.data)).toBe(true)
              if (check.minCount > 0) {
                expect(body.data.length).toBeGreaterThanOrEqual(check.minCount)
              }
            }
          })
        }
      }

      test('health endpoint returns ok', async ({ request }) => {
        const res = await request.get(`${preset.url}/health`)
        expect(res.status()).toBe(200)
        const body = await res.json()
        expect(body.status).toBe('ok')
      })
    })

    test.describe('Page renders real data', () => {
      if (preset.isLoginPage) {
        test('login page renders with form elements', async ({ page }) => {
          await page.goto(`${preset.url}${preset.pagePath}`)
          await page.waitForLoadState('networkidle')

          const usernameInput = page
            .locator(
              'input[type="text"], input[name="username"], input[placeholder*="用户"], input[placeholder*="User"]'
            )
            .first()
          await expect(usernameInput, 'Username input should be visible').toBeVisible()

          const passwordInput = page.locator('input[type="password"]').first()
          await expect(passwordInput, 'Password input should be visible').toBeVisible()

          const submitButton = page
            .locator('button[type="submit"], button:has-text("登录"), button:has-text("Login")')
            .first()
          await expect(submitButton, 'Submit button should be visible').toBeVisible()
        })

        test('login page has login-related text', async ({ page }) => {
          await page.goto(`${preset.url}${preset.pagePath}`)
          await page.waitForLoadState('networkidle')

          const text = await getPageText(page)
          const hasLoginText =
            text.includes('登录') ||
            text.includes('Login') ||
            text.includes('用户名') ||
            text.includes('密码')
          expect(hasLoginText, 'Login page should have login-related Chinese text').toBe(true)
        })

        test('login page shows quick login options', async ({ page }) => {
          await page.goto(`${preset.url}${preset.pagePath}`)
          await page.waitForLoadState('networkidle')

          const text = await getPageText(page)
          const hasQuickLogin =
            text.includes('superadmin') ||
            text.includes('Quick') ||
            text.includes('快速') ||
            text.includes('demo') ||
            text.includes('Demo')
          expect(hasQuickLogin, 'Should have quick login option').toBe(true)
        })
      } else {
        test('page loads with visible content (not blank)', async ({ page }) => {
          await page.goto(`${preset.url}${preset.pagePath}`)
          await waitForSPARender(page)

          const text = await getPageText(page)
          expect(
            text.trim().length,
            'Page body should have text content (not blank)'
          ).toBeGreaterThan(100)
        })

        test('page renders list items with text content', async ({ page }) => {
          await page.goto(`${preset.url}${preset.pagePath}`)
          await waitForSPARender(page)

          const text = await getPageText(page)

          if (preset.seedTitles) {
            const visible = preset.seedTitles.filter(t => text.includes(t))
            expect(
              visible.length,
              `At least 1 seed title should render on page, found: [${visible.join(', ')}]`
            ).toBeGreaterThanOrEqual(1)
          } else if (preset.topicKeywords) {
            const visible = preset.topicKeywords.filter(kw => text.includes(kw))
            expect(
              visible.length,
              `At least 1 topic keyword should appear on page, found: [${visible.join(', ')}]`
            ).toBeGreaterThanOrEqual(1)
          } else if (preset.brandingKeywords) {
            const visible = preset.brandingKeywords.filter(kw => text.includes(kw))
            expect(
              visible.length,
              `At least 1 branding keyword should appear on page, found: [${visible.join(', ')}]`
            ).toBeGreaterThanOrEqual(1)
          }
        })

        test('page has no critical console errors', async ({ page }) => {
          const errors: string[] = []
          page.on('console', msg => {
            if (msg.type() === 'error') {
              errors.push(msg.text())
            }
          })

          await page.goto(`${preset.url}${preset.pagePath}`)
          await waitForSPARender(page)

          const criticalErrors = errors.filter(
            e =>
              !e.includes('favicon') &&
              !e.includes('manifest') &&
              !e.includes('DevTools') &&
              !e.includes('net::ERR') &&
              !e.includes('react-router')
          )
          expect(
            criticalErrors.length,
            `No critical console errors. Errors: ${criticalErrors.join('; ')}`
          ).toBe(0)
        })
      }
    })

    if (preset.htmlEntryRedirects) {
      test.describe('HTML entry redirect', () => {
        for (const redirect of preset.htmlEntryRedirects) {
          test(`GET ${redirect.path} redirects or serves ${redirect.expectedPath}`, async ({
            request,
          }) => {
            const res = await request.get(`${preset.url}${redirect.path}`, {
              maxRedirects: 0,
            })

            const isRedirect = [301, 302, 303, 307, 308].includes(res.status())
            if (isRedirect) {
              const location = res.headers()['location']
              expect(location, `Redirect should point to ${redirect.expectedPath}`).toContain(
                redirect.expectedPath.replace(/\/$/, '')
              )
            } else {
              expect(res.status(), `Should return 200 for ${redirect.path}`).toBe(200)
              const contentType = res.headers()['content-type'] ?? ''
              expect(
                contentType.includes('text/html'),
                `Should serve HTML for ${redirect.path}`
              ).toBe(true)
            }
          })
        }
      })
    }
  })
}

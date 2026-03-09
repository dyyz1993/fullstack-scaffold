import { defineConfig, devices } from '@playwright/test'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load test environment variables
dotenv.config({ path: join(__dirname, '.env.test') })

/**
 * Playwright E2E Test Configuration
 *
 * Usage:
 * - npx playwright test                    # Run all E2E tests
 * - npx playwright test --ui               # Run with UI mode
 * - npx playwright test --debug            # Debug mode with inspector
 * - npx playwright test --project=chromium # Run on specific browser
 * - npx playwright codegen                 # Generate test code by recording
 *
 * Docs: https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory
  testDir: './tests/e2e',

  // Test files pattern
  testMatch: '**/*.spec.ts',

  // Timeout per test (default 30s)
  timeout: 30 * 1000,

  // Expect timeout (assertions)
  expect: {
    timeout: 5 * 1000,
  },

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // 并发限制：最多同时创建3个浏览器实例，避免资源占用过高
  workers: 3,

  // Global setup/teardown for dynamic port allocation
  globalSetup: join(__dirname, 'tests', 'e2e', 'global-setup.ts'),
  globalTeardown: join(__dirname, 'tests', 'e2e', 'global-teardown.ts'),

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report/html', open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['list'],
  ],

  // ⚠️ IMPORTANT: Artifact directories configuration
  // All test artifacts are stored in separate directories under playwright-artifacts/
  // Screenshots: playwright-artifacts/screenshots/
  // Videos: playwright-artifacts/videos/
  // Traces: playwright-artifacts/traces/
  // Downloads: playwright-artifacts/downloads/
  outputDir: 'playwright-artifacts',

  // Shared settings for all tests
  use: {
    // Collect trace when retrying the failed test
    // Trace files stored in: playwright-artifacts/traces/
    trace: 'on-first-retry',

    // Screenshot on failure
    // Screenshots stored in: playwright-artifacts/screenshots/
    screenshot: 'only-on-failure',

    // Video on failure
    // Videos stored in: playwright-artifacts/videos/
    video: 'retain-on-failure',

    // Browser locale
    locale: 'zh-CN',

    // Timezone
    timezoneId: 'Asia/Shanghai',

    // Viewport size
    viewport: { width: 1280, height: 720 },
  },

  // Projects define different browser configurations
  projects: [
    {
      name: process.env.PLAYWRIGHT_TEST_BROWSER_TYPE || 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
})

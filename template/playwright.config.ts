import { defineConfig, devices } from '@playwright/test'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '.env.test') })

// Check if using external URLs (shanbox)
const useExternalURL = process.env.USE_EXTERNAL_URL === 'true'

const browserExecutablePath = process.env.PLAYWRIGHT_TEST_BROWSER_EXECUTABLE_PATH

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  testIgnore: '**/utils/**',
  timeout: 30 * 1000,
  expect: {
    timeout: 5 * 1000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.1,
      animations: 'disabled',
    },
  },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 3,
  globalSetup: useExternalURL ? undefined : join(__dirname, 'tests', 'e2e', 'global-setup.ts'),
  globalTeardown: useExternalURL
    ? undefined
    : join(__dirname, 'tests', 'e2e', 'global-teardown.ts'),
  reporter: [
    ['html', { outputFolder: 'playwright-report/html', open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['list'],
  ],
  outputDir: 'playwright-artifacts',
  use: {
    ignoreHTTPSErrors: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ignoreHTTPSErrors: true,
        ...(browserExecutablePath
          ? { launchOptions: { executablePath: browserExecutablePath } }
          : {}),
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        ignoreHTTPSErrors: true,
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        ignoreHTTPSErrors: true,
      },
    },
  ],
})

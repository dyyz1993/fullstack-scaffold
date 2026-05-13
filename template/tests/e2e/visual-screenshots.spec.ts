/**
 * Visual Screenshot Capture
 *
 * Captures screenshots of all key pages for visual verification.
 * Screenshots are saved to playwright-artifacts/screenshots/ and
 * uploaded as CI artifacts for review.
 *
 * Two modes:
 *   1. Template screenshots (existing) — screenshots the template's own pages
 *   2. Per-Preset Gallery (new) — scaffolds each preset, starts dev server,
 *      captures all pages, generates HTML gallery
 *
 * Usage:
 *   - CI: Screenshots uploaded as artifacts automatically
 *   - Local: Check template/playwright-artifacts/gallery/
 *
 * Tagged @slow — these tests take time due to scaffolding + dev server startup.
 */

/* eslint-disable no-console */

import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { execSync, spawn } from 'node:child_process'
import os from 'node:os'

const ARTIFACTS_DIR = path.resolve(import.meta.dirname, '../../playwright-artifacts/screenshots')
const GALLERY_DIR = path.resolve(import.meta.dirname, '../../playwright-artifacts/gallery')
const TEMPLATE_ROOT = path.resolve(import.meta.dirname, '../..')

function getBaseUrl(): string {
  return process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3010'
}

fs.mkdirSync(ARTIFACTS_DIR, { recursive: true })
fs.mkdirSync(GALLERY_DIR, { recursive: true })

// ─── Utility Functions ──────────────────────────────────────────────

async function capturePage(
  page: import('@playwright/test').Page,
  name: string,
  outputDir?: string
) {
  const dir = outputDir || ARTIFACTS_DIR
  const screenshotPath = path.join(dir, `${name}.png`)
  const buffer = await page.screenshot({ fullPage: true })
  fs.writeFileSync(screenshotPath, buffer)
   
  console.log(`  📸 Saved: ${screenshotPath}`)
}

async function checkConsoleErrors(page: import('@playwright/test').Page): Promise<string[]> {
  const errors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
    }
  })
  return errors
}

interface PresetConfig {
  id: string
  name: string
  clientPages: Array<{ route: string; label: string; slug?: string }>
  adminPages: Array<{ route: string; label: string }>
}

const PRESET_PAGE_CONFIGS: PresetConfig[] = [
  {
    id: 'fullstack-admin',
    name: 'Full Admin (Recommended)',
    clientPages: [
      { route: '/todos', label: 'todo-page' },
      { route: '/notifications', label: 'notifications-page' },
      { route: '/websocket', label: 'websocket-page' },
      { route: '/content', label: 'content-page' },
      { route: '/login', label: 'login-page' },
      { route: '/register', label: 'register-page' },
      { route: '/plugins', label: 'plugins-page' },
      { route: '/plugins/sample-plugin', label: 'plugin-detail-page' },
      { route: '/categories', label: 'categories-page' },
      { route: '/search', label: 'search-page' },
      { route: '/publish', label: 'publish-page' },
      { route: '/developer', label: 'developer-dashboard' },
    ],
    adminPages: [
      { route: '/admin/login', label: 'admin-login' },
      { route: '/admin/dashboard', label: 'admin-dashboard' },
      { route: '/admin/users', label: 'admin-users' },
      { route: '/admin/orders', label: 'admin-orders' },
      { route: '/admin/tickets', label: 'admin-tickets' },
      { route: '/admin/disputes', label: 'admin-disputes' },
      { route: '/admin/content', label: 'admin-content' },
      { route: '/admin/system/settings', label: 'admin-settings' },
      { route: '/admin/system/permissions', label: 'admin-permissions' },
      { route: '/admin/system/roles', label: 'admin-roles' },
      { route: '/admin/plugins', label: 'admin-plugins' },
      { route: '/admin/plugins/review', label: 'admin-plugin-review' },
      { route: '/admin/categories', label: 'admin-categories' },
    ],
  },
  {
    id: 'xbrowser-marketplace',
    name: 'Plugin Marketplace',
    clientPages: [
      { route: '/notifications', label: 'notifications-page' },
      { route: '/login', label: 'login-page' },
      { route: '/register', label: 'register-page' },
      { route: '/plugins', label: 'plugins-page' },
      { route: '/plugins/sample-plugin', label: 'plugin-detail-page' },
      { route: '/categories', label: 'categories-page' },
      { route: '/search', label: 'search-page' },
      { route: '/publish', label: 'publish-page' },
      { route: '/developer', label: 'developer-dashboard' },
    ],
    adminPages: [
      { route: '/admin/login', label: 'admin-login' },
      { route: '/admin/plugins', label: 'admin-plugins' },
      { route: '/admin/plugins/review', label: 'admin-plugin-review' },
      { route: '/admin/categories', label: 'admin-categories' },
    ],
  },
  {
    id: 'todo-app',
    name: 'Todo App',
    clientPages: [
      { route: '/todos', label: 'todo-page' },
      { route: '/notifications', label: 'notifications-page' },
      { route: '/websocket', label: 'websocket-page' },
      { route: '/login', label: 'login-page' },
      { route: '/register', label: 'register-page' },
    ],
    adminPages: [],
  },
  {
    id: 'minimal',
    name: 'Minimal',
    clientPages: [
      { route: '/todos', label: 'todo-page' },
      { route: '/login', label: 'login-page' },
      { route: '/register', label: 'register-page' },
    ],
    adminPages: [],
  },
]

const DEV_SERVER_PORT = 30999

async function scaffoldProject(presetId: string, outputDir: string): Promise<string> {
   
  console.log(`\n  🏗️  Scaffolding preset "${presetId}" → ${outputDir}`)

  const cliEntry = path.join(TEMPLATE_ROOT, '../src/index.ts')
  execSync(`npx tsx "${cliEntry}" "test-${presetId}" -p ${presetId} -o "${outputDir}"`, {
    cwd: TEMPLATE_ROOT,
    stdio: 'pipe',
    timeout: 120_000,
    env: { ...process.env, CI: 'true' },
  })

   
  console.log(`  ✅ Scaffolded to ${outputDir}`)
  return outputDir
}

async function installDeps(projectPath: string): Promise<void> {
   
  console.log(`  📦 Installing dependencies in ${projectPath}...`)

  execSync('npm install --prefer-offline', {
    cwd: projectPath,
    stdio: 'pipe',
    timeout: 180_000,
  })

   
  console.log('  ✅ Dependencies installed')
}

interface DevServerHandle {
  port: number
  process: ReturnType<typeof spawn>
  url: string
}

async function startDevServer(projectPath: string, port: number): Promise<DevServerHandle> {
   
  console.log(`  🚀 Starting dev server on port ${port}...`)

  const proc = spawn('npx', ['vite', '--port', String(port), '--host'], {
    cwd: projectPath,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'development' },
    detached: false,
  })

  let stdout = ''
  let stderr = ''

  proc.stdout?.on('data', (chunk: Buffer) => {
    stdout += chunk.toString()
  })
  proc.stderr?.on('data', (chunk: Buffer) => {
    stderr += chunk.toString()
  })

  const url = `http://localhost:${port}`

  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 1000))
    try {
      const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(3000) })
      if (res.ok) {
         
        console.log(`  ✅ Dev server ready at ${url}`)
        return { port, process: proc, url }
      }
    } catch {
      // keep waiting
    }

    if (!proc.pid || proc.exitCode !== null) {
      throw new Error(`Dev server exited unexpectedly:\nstdout: ${stdout}\nstderr: ${stderr}`)
    }
  }

  throw new Error(`Dev server did not start within 60s:\nstdout: ${stdout}\nstderr: ${stderr}`)
}

function stopDevServer(handle: DevServerHandle): void {
  try {
    handle.process.kill('SIGTERM')
  } catch {
    // already dead
  }
}

async function safeScreenshotPage(
  page: import('@playwright/test').Page,
  baseUrl: string,
  route: string,
  label: string,
  outputDir: string,
  index: number
): Promise<boolean> {
  const name = `${String(index).padStart(2, '0')}-${label}`
  const fullUrl = `${baseUrl}${route}`

  try {
    const res = await page.goto(fullUrl, { timeout: 15_000 })
    if (!res || (res.status() >= 400 && res.status() < 600)) {
       
      console.log(`  ⚠️  Skip ${name}: HTTP ${res?.status()} for ${route}`)
      return false
    }

    await page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => {})
    await page.waitForTimeout(500)
    await capturePage(page, name, outputDir)
    return true
  } catch (err) {
     
    console.log(`  ⚠️  Skip ${name}: ${(err as Error).message.slice(0, 100)} for ${route}`)
    return false
  }
}

// ─── Gallery Generator ─────────────────────────────────────────────

interface GalleryImage {
  presetId: string
  presetName: string
  filename: string
  label: string
  relativePath: string
}

function generateGallery(screenshotsBaseDir: string, presets: PresetConfig[]): void {
  const images: GalleryImage[] = []

  for (const preset of presets) {
    const presetDir = path.join(screenshotsBaseDir, preset.id)
    if (!fs.existsSync(presetDir)) continue

    const files = fs
      .readdirSync(presetDir)
      .filter(f => f.endsWith('.png'))
      .sort()
    for (const file of files) {
      images.push({
        presetId: preset.id,
        presetName: preset.name,
        filename: file,
        label: file.replace(/^\d+-/, '').replace(/\.png$/, ''),
        relativePath: path.join(preset.id, file),
      })
    }
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Screenshot Gallery — Visual Reference</title>
<style>
  :root {
    --bg: #0f1117;
    --surface: #1a1d27;
    --surface-hover: #242836;
    --border: #2e3347;
    --text: #e4e6ef;
    --text-muted: #8b8fa3;
    --accent: #6c8cff;
    --accent-glow: rgba(108,140,255,.15);
    --success: #4ade80;
    --radius: 12px;
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
    background: var(--bg); color: var(--text);
    line-height: 1.6;
  }
  .header {
    text-align:center; padding:48px 24px 32px;
    background: linear-gradient(135deg,#1a1d27 0%,#161922 100%);
    border-bottom:1px solid var(--border);
  }
  .header h1 { font-size:28px; font-weight:700; letter-spacing:-.5px; margin-bottom:8px; }
  .header p { color:var(--text-muted); font-size:14px; }
  .header .badge {
    display:inline-block; padding:4px 12px; border-radius:20px;
    background:var(--accent-glow); color:var(--accent);
    font-size:12px; font-weight:600; margin-top:12px;
  }
  .stats {
    display:flex; justify-content:center; gap:32px; margin-top:20px;
  }
  .stat { text-align:center; }
  .stat .num { font-size:24px; font-weight:700; color:var(--accent); }
  .stat .lbl { font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.5px; }
  .container { max-width:1400px; margin:0 auto; padding:32px 24px; }
  .section { margin-bottom:56px; }
  .section-title {
    display:flex; align-items:center; gap:10px;
    font-size:18px; font-weight:600; margin-bottom:20px;
    padding-bottom:12px; border-bottom:1px solid var(--border);
  }
  .section-title .dot {
    width:8px; height:8px; border-radius:50%; background:var(--success);
    box-shadow:0 0 8px var(--success);
  }
  .grid {
    display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr));
    gap:20px;
  }
  .card {
    background:var(--surface); border:1px solid var(--border);
    border-radius:var(--radius); overflow:hidden;
    transition:transform .2s ease, box-shadow .2s ease, border-color .2s ease;
    cursor:pointer;
  }
  .card:hover {
    transform:translateY(-4px);
    box-shadow:0 12px 32px rgba(0,0,0,.35);
    border-color:var(--accent);
  }
  .card img {
    width:100%; height:auto; display:block;
    border-bottom:1px solid var(--border);
  }
  .card-label {
    padding:10px 14px; font-size:13px; font-weight:500;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  }
  .card-label code {
    background:var(--bg); padding:2px 6px; border-radius:4px;
    font-size:11px; color:var(--accent); margin-left:6px;
  }
  .lightbox {
    position:fixed; inset:0; background:rgba(0,0,0,.85);
    display:none; align-items:center; justify-content:center;
    z-index:9999; cursor:pointer; backdrop-filter:blur(8px);
  }
  .lightbox.active { display:flex; }
  .lightbox img {
    max-width:90vw; max-height:90vh;
    border-radius:var(--radius); box-shadow:0 24px 64px rgba(0,0,0,.5);
  }
  .footer {
    text-align:center; padding:32px; color:var(--text-muted);
    font-size:12px; border-top:1px solid var(--border);
  }
</style>
</head>
<body>

<div class="header">
  <h1>🖼️ Screenshot Gallery</h1>
  <p>Visual reference for all template presets — generated automatically by Playwright E2E tests</p>
  <div class="badge">@slow · Per-Preset Screenshot Gallery</div>
  <div class="stats">
    <div class="stat"><div class="num">${presets.length}</div><div class="lbl">Presets</div></div>
    <div class="stat"><div class="num">${images.length}</div><div class="lbl">Screenshots</div></div>
  </div>
</div>

<div class="container">

${presets
  .map(preset => {
    const presetImages = images.filter(img => img.presetId === preset.id)
    if (presetImages.length === 0) return ''
    return `
  <div class="section" id="${preset.id}">
    <div class="section-title"><span class="dot"></span>${preset.name}<code style="color:var(--text-muted);font-size:13px;margin-left:8px;">${preset.id}</code></div>
    <div class="grid">
      ${presetImages
        .map(
          img => `
      <div class="card" onclick="showLightbox('${img.relativePath}')">
        <img src="${img.relativePath}" alt="${img.label}" loading="lazy" />
        <div class="card-label">${img.label.replace(/-/g, ' ')}</div>
      </div>`
        )
        .join('\n')}
    </div>
  </div>`
  })
  .join('\n')}

</div>

<div class="lightbox" id="lightbox" onclick="hideLightbox()">
  <img id="lb-img" src="" alt="preview" />
</div>

<div class="footer">
  Generated by <code>visual-screenshots.spec.ts</code> &middot; ${new Date().toISOString().split('T')[0]}
</div>

<script>
function showLightbox(src) {
  document.getElementById('lb-img').src = src;
  document.getElementById('lightbox').classList.add('active');
}
function hideLightbox() {
  document.getElementById('lightbox').classList.remove('active');
}
document.addEventListener('keydown', e => { if(e.key==='Escape') hideLightbox(); });
</script>
</body>
</html>`

  const indexPath = path.join(screenshotsBaseDir, 'index.html')
  fs.writeFileSync(indexPath, html, 'utf-8')
  console.log(`\n  🖼️  Gallery generated: ${indexPath}`)
  console.log(`     ${images.length} screenshots across ${presets.length} presets\n`)
}

// ════════════════════════════════════════════════════════════════════
//  PART 1: Template Self-Screenshots (existing functionality)
// ════════════════════════════════════════════════════════════════════

test.describe('Visual Screenshots — Template', () => {
  test.describe.configure({ retries: 1 })
  test.setTimeout(60000)

  test.beforeEach(async ({ page }) => {
    checkConsoleErrors(page)
    try {
      await page.request.post(`${getBaseUrl()}/api/__test__/cleanup`)
    } catch {
      // ignore
    }
  })

  test('todo page — empty state', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/todos`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(500)
    await expect(page.locator('body')).toBeVisible()
    await capturePage(page, '01-todo-page')
  })

  test('notifications page', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/notifications`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(500)
    await capturePage(page, '03-notifications-page')
  })

  test('websocket page', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/websocket`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(500)
    await capturePage(page, '04-websocket-page')
  })

  test('content page', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/content`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(500)
    await capturePage(page, '05-content-page')
  })

  test('login page', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/login`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(500)
    await capturePage(page, '06-login-page')
  })

  test('register page', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/register`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(500)
    await capturePage(page, '07-register-page')
  })

  test('admin login page', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/admin/login`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(500)
    await capturePage(page, '08-admin-login-page')
  })

  test('admin dashboard (if auth works)', async ({ page }) => {
    await page.request.post(`${getBaseUrl()}/api/auth/register`, {
      data: { email: 'admin@test.com', password: 'admin123', username: 'admin' },
    })
    const loginRes = await page.request.post(`${getBaseUrl()}/api/auth/login`, {
      data: { username: 'admin', password: 'admin123' },
    })
    const loginBody = await loginRes.json()
    const token = loginBody.success ? loginBody.data?.token : null

    if (token) {
      await page.goto(`${getBaseUrl()}/admin/login`)
      await page.waitForLoadState('domcontentloaded')
      await page.evaluate((t: string) => {
        const storage = {
          state: {
            user: { id: '1', email: 'admin@test.com', name: 'Admin', role: 'super_admin' },
            token: t,
            isAuthenticated: true,
          },
          version: 0,
        }
        localStorage.setItem('admin-storage', JSON.stringify(storage))
      }, token)
      await page.goto(`${getBaseUrl()}/admin/dashboard`)
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(1500)
      await capturePage(page, '09-admin-dashboard')
    } else {
      await page.goto(`${getBaseUrl()}/admin/login`)
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(500)
      await capturePage(page, '09-admin-login-fallback')
    }
  })

  test('todo page — mobile (375×812)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(`${getBaseUrl()}/todos`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(500)
    await capturePage(page, '10-todo-page-mobile')
  })
})

// ════════════════════════════════════════════════════════════════════
//  PART 2: Per-Preset Screenshot Gallery
// ════════════════════════════════════════════════════════════════════

test.describe('Per-Preset Screenshot Gallery @slow', () => {
  test.describe.configure({ retries: 1, mode: 'serial' })
  test.setTimeout(300_000)

  for (const preset of PRESET_PAGE_CONFIGS) {
    test.describe(`Preset: ${preset.name} (${preset.id})`, () => {
      let serverHandle: DevServerHandle | null = null
      const presetOutputDir = path.join(GALLERY_DIR, preset.id)
      let pageIndex = 0

      test.beforeAll(async () => {
        fs.mkdirSync(presetOutputDir, { recursive: true })

        const tmpRoot = path.join(os.tmpdir(), `biomimic-gallery-${preset.id}-${Date.now()}`)
        const projectPath = await scaffoldProject(preset.id, tmpRoot)
        await installDeps(projectPath)
        serverHandle = await startDevServer(
          projectPath,
          DEV_SERVER_PORT + PRESET_PAGE_CONFIGS.indexOf(preset)
        )
      })

      test.afterAll(async () => {
        if (serverHandle) {
          stopDevServer(serverHandle)
          serverHandle = null
        }
      })

      for (const pageCfg of preset.clientPages) {
        test(`client: ${pageCfg.label}`, async ({ page }) => {
          if (!serverHandle) throw new Error('Dev server not started')
          checkConsoleErrors(page)
          const ok = await safeScreenshotPage(
            page,
            serverHandle.url,
            pageCfg.route,
            pageCfg.label,
            presetOutputDir,
            ++pageIndex
          )
          expect(ok).toBeTruthy()
        })
      }

      for (const pageCfg of preset.adminPages) {
        test(`admin: ${pageCfg.label}`, async ({ page }) => {
          if (!serverHandle) throw new Error('Dev server not started')
          checkConsoleErrors(page)

          const ok = await safeScreenshotPage(
            page,
            serverHandle.url,
            pageCfg.route,
            pageCfg.label,
            presetOutputDir,
            ++pageIndex
          )
          expect(ok).toBeTruthy()
        })
      }
    })
  }

  test('generate HTML gallery from captured screenshots', async () => {
    generateGallery(GALLERY_DIR, PRESET_PAGE_CONFIGS)

    const galleryIndexPath = path.join(GALLERY_DIR, 'index.html')
    expect(fs.existsSync(galleryIndexPath)).toBe(true)

    const htmlContent = fs.readFileSync(galleryIndexPath, 'utf-8')
    expect(htmlContent).toContain('<!DOCTYPE html>')
    expect(htmlContent).toContain('Screenshot Gallery')
    expect(htmlContent).toContain('.grid')
    expect(htmlContent).toContain('.lightbox')

    for (const preset of PRESET_PAGE_CONFIGS) {
      const presetDir = path.join(GALLERY_DIR, preset.id)
      if (fs.existsSync(presetDir)) {
        const files = fs.readdirSync(presetDir).filter(f => f.endsWith('.png'))
        expect(files.length).toBeGreaterThan(0)
      }
    }
  })
})

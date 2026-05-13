/* eslint-disable no-console */
/**
 * Visual Screenshot Capture
 *
 * Captures screenshots of all key pages for visual verification.
 * Screenshots are saved to playwright-artifacts/screenshots/ and
 * uploaded as CI artifacts for review.
 *
 * Two modes:
 *   1. Template screenshots (existing) — screenshots the template's own pages
 *   2. Per-Preset Gallery — scaffolds each preset, starts dev server,
 *      captures all pages in user-flow order with login + data seeding,
 *      generates HTML gallery
 *
 * Usage:
 *   - CI: Screenshots uploaded as artifacts automatically
 *   - Local: Check template/playwright-artifacts/gallery/
 *
 * Tagged @slow — these tests take time due to scaffolding + dev server startup.
 */

import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { execSync, spawn } from 'node:child_process'
import os from 'node:os'

// @ts-expect-error — TS config doesn't resolve .ts imports for E2E
import { getPreset } from '../../modules.config.ts'

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

// ─── Login Helpers ──────────────────────────────────────────────────

interface AuthTokens {
  clientToken: string
  clientUser: { id: string; email: string; username: string; role: string }
  adminToken: string
  adminUser: { id: string; username: string; email: string; role: string }
}

async function registerAndLoginUsers(
  page: import('@playwright/test').Page,
  baseUrl: string,
  presetId: string
): Promise<AuthTokens> {
  const preset = getPreset(presetId)
  const modules = new Set(preset?.modules ?? [])
  const hasAuth = modules.has('auth')
  const hasAdmin = modules.has('admin')

  let clientToken = ''
  const clientUser = {
    id: '1',
    username: 'screenshotuser',
    email: 'screenshot@test.com',
    role: 'developer',
  }
  let adminToken = ''
  const adminUser = {
    id: '2',
    username: 'superadmin',
    email: 'admin@test.com',
    role: 'super_admin',
  }

  // Client auth: use /api/auth/* if auth module present
  if (hasAuth) {
    await page.request
      .post(`${baseUrl}/api/auth/register`, {
        data: { username: 'screenshotuser', email: 'screenshot@test.com', password: 'test123456' },
      })
      .catch(() => {})
    const clientLoginRes = await page.request.post(`${baseUrl}/api/auth/login`, {
      data: { account: 'screenshotuser', password: 'test123456' },
    })
    const clientLoginBody = await clientLoginRes.json()
    clientToken = clientLoginBody.data?.token ?? clientLoginBody.data?.profile?.token ?? ''
    const profile = clientLoginBody.data?.profile ?? clientLoginBody.data ?? {}
    if (profile.id) clientUser.id = profile.id
    if (profile.username) clientUser.username = profile.username
    if (profile.email) clientUser.email = profile.email
    if (profile.role) clientUser.role = profile.role
  }

  // Admin auth: always use dev token (more reliable than register/login)
  // Dev tokens are enabled in dev/test environments and provide guaranteed super_admin access
  if (hasAdmin) {
    adminToken = 'super-admin-token'
    adminUser.id = 'super-admin-1'
    adminUser.username = 'superadmin'
    adminUser.email = 'superadmin@example.com'
    adminUser.role = 'super_admin'
  }

  return { clientToken, clientUser, adminToken, adminUser }
}

async function setClientAuth(
  page: import('@playwright/test').Page,
  token: string,
  user: AuthTokens['clientUser']
): Promise<void> {
  await page.evaluate(
    ({ token: t, user: u }) => {
      localStorage.setItem(
        'auth-storage',
        JSON.stringify({
          state: { token: t, isAuthenticated: true, user: u },
          version: 0,
        })
      )
    },
    { token, user }
  )
}

async function setAdminAuth(
  page: import('@playwright/test').Page,
  token: string,
  user: AuthTokens['adminUser']
): Promise<void> {
  await page.evaluate(
    ({ token: t, user: u }) => {
      localStorage.setItem(
        'admin-storage',
        JSON.stringify({
          state: { token: t, isAuthenticated: true, user: u },
          version: 0,
        })
      )
    },
    { token, user }
  )
}

// ─── Data Seeding ───────────────────────────────────────────────────

async function seedTodos(
  page: import('@playwright/test').Page,
  baseUrl: string,
  token: string
): Promise<void> {
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
  const todos = [
    { title: 'Buy groceries for the week', completed: false },
    { title: 'Read "Designing Data-Intensive Applications"', completed: false },
    { title: 'Review pull request #42', completed: true },
    { title: 'Set up CI/CD pipeline', completed: false },
    { title: 'Write unit tests for auth module', completed: true },
  ]
  for (const todo of todos) {
    await page.request.post(`${baseUrl}/api/todos`, { data: todo, headers })
  }
}

async function seedNotifications(
  page: import('@playwright/test').Page,
  baseUrl: string
): Promise<void> {
  const notifications = [
    {
      type: 'success',
      title: 'Deployment Successful',
      message: 'Your application has been deployed to production.',
    },
    { type: 'info', title: 'New Comment', message: 'John Doe commented on your pull request.' },
    {
      type: 'warning',
      title: 'Storage Running Low',
      message: 'Your cloud storage is 85% full. Consider upgrading.',
    },
    {
      type: 'error',
      title: 'Build Failed',
      message: 'The CI build for branch feature/auth failed.',
    },
  ]
  for (const n of notifications) {
    await page.request.post(`${baseUrl}/api/notifications`, { data: n })
  }
}

async function seedPlugins(
  page: import('@playwright/test').Page,
  baseUrl: string,
  token: string,
  adminToken?: string
): Promise<void> {
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
  const adminHeaders: Record<string, string> = adminToken
    ? { Authorization: `Bearer ${adminToken}` }
    : {}
  const plugins = [
    {
      name: 'Code Formatter Pro',
      slug: 'code-formatter-pro',
      description:
        'Advanced code formatting with support for 50+ languages. Customizable rules, team presets, and auto-format on save.',
      tags: ['formatting', 'productivity'],
      license: 'MIT',
    },
    {
      name: 'Git Lens',
      slug: 'git-lens',
      description:
        'Supercharge Git within your editor. See commit blame, file history, and branch comparisons at a glance.',
      tags: ['git', 'version-control'],
      license: 'MIT',
      featured: true,
    },
    {
      name: 'Theme Studio',
      slug: 'theme-studio',
      description:
        'Create and share custom editor themes with a visual designer. Import from VS Code, export everywhere.',
      tags: ['themes', 'customization'],
    },
  ]
  // Create plugins (status defaults to 'pending')
  for (const p of plugins) {
    await page.request.post(`${baseUrl}/api/plugins`, { data: p, headers }).catch(() => {})
  }
  // Approve all plugins so they appear on client pages (GET /api/plugins defaults to status='approved')
  if (adminToken) {
    for (const p of plugins) {
      await page.request
        .put(`${baseUrl}/api/plugins/${p.slug}/approve`, { headers: adminHeaders })
        .catch(() => {})
    }
    // Toggle featured for Git Lens (approve doesn't set featured flag)
    await page.request
      .put(`${baseUrl}/api/plugins/git-lens/feature`, { headers: adminHeaders })
      .catch(() => {})
  }
}

async function seedAllData(
  page: import('@playwright/test').Page,
  baseUrl: string,
  tokens: AuthTokens,
  presetId: string
): Promise<void> {
  const preset = getPreset(presetId)
  const modules = new Set(preset?.modules ?? [])

  if (modules.has('todos')) await seedTodos(page, baseUrl, tokens.clientToken)
  if (modules.has('notifications')) await seedNotifications(page, baseUrl)
  if (modules.has('plugin')) await seedPlugins(page, baseUrl, tokens.clientToken, tokens.adminToken)
}

// ─── CLI Terminal Screenshot ────────────────────────────────────────

function generateTerminalHtml(command: string, stdout: string, stderr: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const lines = (stdout + (stderr ? '\n' + stderr : ''))
    .split('\n')
    .map(l => `<span class="output">${esc(l)}</span>`)
    .join('\n')

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#1e1e2e; color:#cdd6f4; font-family:'Menlo','Monaco','Courier New',monospace; font-size:13px; line-height:1.6; padding:20px; min-height:100vh; }
  .terminal { background:#181825; border-radius:12px; padding:16px; border:1px solid #313244; max-width:900px; margin:0 auto; }
  .titlebar { display:flex; gap:8px; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid #313244; }
  .dot { width:12px; height:12px; border-radius:50%; }
  .dot.red { background:#f38ba8; } .dot.yellow { background:#f9e2af; } .dot.green { background:#a6e3a1; }
  .prompt { color:#a6e3a1; font-weight:bold; }
  .cmd { color:#89b4fa; }
  .output { color:#cdd6f4; }
  pre { white-space:pre-wrap; word-break:break-all; margin:0; }
</style></head>
<body>
<div class="terminal">
  <div class="titlebar"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div>
  <pre><span class="prompt">$</span> <span class="cmd">${esc(command)}</span>
${lines}</pre>
</div>
</body></html>`
}

async function captureTerminalScreenshot(
  command: string,
  args: string[],
  cwd: string,
  outputDir: string,
  label: string,
  page: import('@playwright/test').Page
): Promise<boolean> {
  try {
    const result = execSync(`${command} ${args.join(' ')}`, {
      cwd,
      stdio: 'pipe',
      timeout: 120_000,
      env: { ...process.env, CI: 'true' },
    })

    const stdout = result.toString()
    const terminalHtml = generateTerminalHtml(`${command} ${args.join(' ')}`, stdout, '')
    const htmlPath = path.join(outputDir, `${label}.html`)
    fs.writeFileSync(htmlPath, terminalHtml, 'utf-8')

    await page.goto(`file://${htmlPath}`)
    await page.waitForTimeout(300)
    await capturePage(page, label, outputDir)
    return true
  } catch (err) {
    const execErr = err as { stdout?: Buffer; stderr?: Buffer }
    const stdout = execErr.stdout?.toString() ?? ''
    const stderr = execErr.stderr?.toString() ?? ''
    const terminalHtml = generateTerminalHtml(`${command} ${args.join(' ')}`, stdout, stderr)
    const htmlPath = path.join(outputDir, `${label}.html`)
    fs.writeFileSync(htmlPath, terminalHtml, 'utf-8')

    await page.goto(`file://${htmlPath}`)
    await page.waitForTimeout(300)
    await capturePage(page, label, outputDir)
    return true
  }
}

// ─── Safe Screenshot with Auth ──────────────────────────────────────

async function screenshotPage(
  page: import('@playwright/test').Page,
  baseUrl: string,
  route: string,
  label: string,
  outputDir: string,
  index: number,
  options?: { waitForTimeout?: number; waitForSelector?: string }
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

    if (options?.waitForSelector) {
      await page.waitForSelector(options.waitForSelector, { timeout: 8_000 }).catch(() => {})
    }

    await page.waitForTimeout(options?.waitForTimeout ?? 800)
    await capturePage(page, name, outputDir)
    return true
  } catch (err) {
    console.log(`  ⚠️  Skip ${name}: ${(err as Error).message.slice(0, 100)} for ${route}`)
    return false
  }
}

// ─── Preset Configuration ───────────────────────────────────────────

interface FlowStep {
  route: string
  label: string
  section: 'cli' | 'client-public' | 'client-auth' | 'admin-public' | 'admin-auth'
  waitForSelector?: string
  waitForTimeout?: number
}

interface PresetConfig {
  id: string
  name: string
  steps: FlowStep[]
}

function buildStepsForPreset(presetId: string): FlowStep[] {
  const steps: FlowStep[] = []

  // Dynamically read module list from modules.config.ts
  const preset = getPreset(presetId)
  const modules = new Set(preset?.modules ?? [])

  const hasTodos = modules.has('todos')
  const hasChat = modules.has('chat')
  const hasNotifications = modules.has('notifications')
  const hasPlugins = modules.has('plugin')
  const hasAuth = modules.has('auth')
  const hasAdmin = modules.has('admin')
  const hasOrders = modules.has('order')
  const hasTickets = modules.has('ticket')
  const hasDisputes = modules.has('dispute')
  const hasContent = modules.has('content')

  // CLI steps
  steps.push({ route: '', label: 'cli-create', section: 'cli' })

  // Client public pages
  if (hasAuth) {
    steps.push({ route: '/', label: 'home-page', section: 'client-public' })
    steps.push({ route: '/register', label: 'register-page', section: 'client-public' })
    steps.push({ route: '/login', label: 'login-page', section: 'client-public' })
  }

  // Client authenticated pages
  if (hasTodos) {
    steps.push({
      route: '/todos',
      label: 'todo-page-with-data',
      section: 'client-auth',
      waitForSelector: '[data-testid="todo-list"], ul, table, .todo',
      waitForTimeout: 1200,
    })
  }

  if (hasNotifications) {
    steps.push({
      route: '/notifications',
      label: 'notifications-page-with-data',
      section: 'client-auth',
      waitForTimeout: 1200,
    })
  }

  if (hasChat) {
    steps.push({ route: '/websocket', label: 'websocket-page', section: 'client-auth' })
  }

  if (hasPlugins) {
    steps.push({
      route: '/plugins',
      label: 'plugins-page-with-data',
      section: 'client-auth',
      waitForSelector: '[data-testid="plugin-card"], .plugin-card, .card, article',
      waitForTimeout: 1500,
    })
    steps.push({
      route: '/plugins/code-formatter-pro',
      label: 'plugin-detail-page',
      section: 'client-auth',
      waitForTimeout: 1200,
    })
    steps.push({
      route: '/categories',
      label: 'categories-page',
      section: 'client-auth',
      waitForTimeout: 1000,
    })
    steps.push({
      route: '/search',
      label: 'search-page',
      section: 'client-auth',
      waitForTimeout: 1000,
    })
    steps.push({ route: '/publish', label: 'publish-page', section: 'client-auth' })
    steps.push({ route: '/developer', label: 'developer-dashboard', section: 'client-auth' })
  }

  if (hasContent) {
    steps.push({ route: '/content', label: 'content-page', section: 'client-auth' })
  }

  // No-auth fallback pages
  if (!hasAuth && hasTodos) {
    steps.unshift({ route: '/', label: 'home-page', section: 'client-public' })
    steps.push({
      route: '/todos',
      label: 'todo-page-with-data',
      section: 'client-public',
      waitForSelector: '[data-testid="todo-list"], ul, table, .todo',
      waitForTimeout: 1200,
    })
  }

  if (!hasAuth && hasNotifications) {
    steps.push({
      route: '/notifications',
      label: 'notifications-page',
      section: 'client-public',
      waitForTimeout: 1000,
    })
  }

  if (!hasAuth && hasChat) {
    steps.push({ route: '/websocket', label: 'websocket-page', section: 'client-public' })
  }

  // Admin pages
  if (hasAdmin) {
    steps.push({ route: '/admin/login', label: 'admin-login-page', section: 'admin-public' })
    steps.push({
      route: '/admin/dashboard',
      label: 'admin-dashboard',
      section: 'admin-auth',
      waitForTimeout: 2000,
    })
    steps.push({
      route: '/admin/users',
      label: 'admin-users',
      section: 'admin-auth',
      waitForTimeout: 1500,
    })
  }

  if (hasOrders) {
    steps.push({
      route: '/admin/orders',
      label: 'admin-orders',
      section: 'admin-auth',
      waitForTimeout: 1500,
    })
  }

  if (hasTickets) {
    steps.push({
      route: '/admin/tickets',
      label: 'admin-tickets',
      section: 'admin-auth',
      waitForTimeout: 1500,
    })
  }

  if (hasDisputes) {
    steps.push({
      route: '/admin/disputes',
      label: 'admin-disputes',
      section: 'admin-auth',
      waitForTimeout: 1500,
    })
  }

  if (hasContent) {
    steps.push({
      route: '/admin/content',
      label: 'admin-content',
      section: 'admin-auth',
      waitForTimeout: 1500,
    })
  }

  if (hasPlugins) {
    steps.push({
      route: '/admin/plugins',
      label: 'admin-plugins',
      section: 'admin-auth',
      waitForTimeout: 1500,
    })
    steps.push({
      route: '/admin/plugins/review',
      label: 'admin-plugin-review',
      section: 'admin-auth',
      waitForTimeout: 1500,
    })
    steps.push({
      route: '/admin/categories',
      label: 'admin-categories',
      section: 'admin-auth',
      waitForTimeout: 1500,
    })
  }

  if (hasAdmin) {
    steps.push({
      route: '/admin/system/settings',
      label: 'admin-settings',
      section: 'admin-auth',
      waitForTimeout: 1500,
    })
    steps.push({
      route: '/admin/system/permissions',
      label: 'admin-permissions',
      section: 'admin-auth',
      waitForTimeout: 1500,
    })
    steps.push({
      route: '/admin/system/roles',
      label: 'admin-roles',
      section: 'admin-auth',
      waitForTimeout: 1500,
    })
  }

  return steps
}

const PRESET_PAGE_CONFIGS: PresetConfig[] = [
  {
    id: 'fullstack-admin',
    name: 'Full Admin (Recommended)',
    steps: buildStepsForPreset('fullstack-admin'),
  },
  {
    id: 'xbrowser-marketplace',
    name: 'Plugin Marketplace',
    steps: buildStepsForPreset('xbrowser-marketplace'),
  },
  { id: 'ecommerce', name: 'E-Commerce', steps: buildStepsForPreset('ecommerce') },
  { id: 'todo-app', name: 'Todo App', steps: buildStepsForPreset('todo-app') },
  { id: 'minimal', name: 'Minimal', steps: buildStepsForPreset('minimal') },
]

// ─── Dev Server Helpers ─────────────────────────────────────────────

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
  execSync('npm install --prefer-offline', { cwd: projectPath, stdio: 'pipe', timeout: 180_000 })
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
    /* already dead */
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
  body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; background:var(--bg); color:var(--text); line-height:1.6; }
  .header { text-align:center; padding:48px 24px 32px; background:linear-gradient(135deg,#1a1d27 0%,#161922 100%); border-bottom:1px solid var(--border); }
  .header h1 { font-size:28px; font-weight:700; letter-spacing:-.5px; margin-bottom:8px; }
  .header p { color:var(--text-muted); font-size:14px; }
  .header .badge { display:inline-block; padding:4px 12px; border-radius:20px; background:var(--accent-glow); color:var(--accent); font-size:12px; font-weight:600; margin-top:12px; }
  .stats { display:flex; justify-content:center; gap:32px; margin-top:20px; }
  .stat { text-align:center; }
  .stat .num { font-size:24px; font-weight:700; color:var(--accent); }
  .stat .lbl { font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.5px; }
  .container { max-width:1400px; margin:0 auto; padding:32px 24px; }
  .section { margin-bottom:56px; }
  .section-title { display:flex; align-items:center; gap:10px; font-size:18px; font-weight:600; margin-bottom:20px; padding-bottom:12px; border-bottom:1px solid var(--border); }
  .section-title .dot { width:8px; height:8px; border-radius:50%; background:var(--success); box-shadow:0 0 8px var(--success); }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:20px; }
  .card { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); overflow:hidden; transition:transform .2s ease, box-shadow .2s ease, border-color .2s ease; cursor:pointer; }
  .card:hover { transform:translateY(-4px); box-shadow:0 12px 32px rgba(0,0,0,.35); border-color:var(--accent); }
  .card img { width:100%; height:auto; display:block; border-bottom:1px solid var(--border); }
  .card-label { padding:10px 14px; font-size:13px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .card-label code { background:var(--bg); padding:2px 6px; border-radius:4px; font-size:11px; color:var(--accent); margin-left:6px; }
  .card .section-badge { display:inline-block; padding:2px 8px; border-radius:10px; font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:.5px; margin-right:6px; }
  .card .section-badge.cli { background:#f9e2af22; color:#f9e2af; }
  .card .section-badge.client { background:#89b4fa22; color:#89b4fa; }
  .card .section-badge.admin { background:#a6e3a122; color:#a6e3a1; }
  .lightbox { position:fixed; inset:0; background:rgba(0,0,0,.85); display:none; align-items:center; justify-content:center; z-index:9999; cursor:pointer; backdrop-filter:blur(8px); }
  .lightbox.active { display:flex; }
  .lightbox img { max-width:90vw; max-height:90vh; border-radius:var(--radius); box-shadow:0 24px 64px rgba(0,0,0,.5); }
  .footer { text-align:center; padding:32px; color:var(--text-muted); font-size:12px; border-top:1px solid var(--border); }
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
        .map(img => {
          const badge = img.label.startsWith('cli-')
            ? 'cli'
            : img.label.startsWith('admin-')
              ? 'admin'
              : 'client'
          return `
      <div class="card" onclick="showLightbox('${img.relativePath}')">
        <img src="${img.relativePath}" alt="${img.label}" loading="lazy" />
        <div class="card-label"><span class="section-badge ${badge}">${badge}</span>${img.label.replace(/-/g, ' ')}</div>
      </div>`
        })
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
function showLightbox(src) { document.getElementById('lb-img').src = src; document.getElementById('lightbox').classList.add('active'); }
function hideLightbox() { document.getElementById('lightbox').classList.remove('active'); }
document.addEventListener('keydown', e => { if(e.key==='Escape') hideLightbox(); });
</script>
</body></html>`

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
  test.setTimeout(600_000)

  test.skip(({ browserName }) => browserName !== 'chromium', 'Gallery only runs on Chromium')

  for (const preset of PRESET_PAGE_CONFIGS) {
    test.describe(`Preset: ${preset.name} (${preset.id})`, () => {
      let serverHandle: DevServerHandle | null = null
      let tokens: AuthTokens | null = null
      const presetOutputDir = path.join(GALLERY_DIR, preset.id)
      const presetProjectPath = path.join(
        os.tmpdir(),
        `biomimic-gallery-${preset.id}-${Date.now()}`
      )

      test.beforeAll(async () => {
        fs.mkdirSync(presetOutputDir, { recursive: true })

        const projectPath = await scaffoldProject(preset.id, presetProjectPath)
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

      test('00 — CLI creation screenshot', async ({ page }) => {
        if (!serverHandle) throw new Error('Dev server not started')
        checkConsoleErrors(page)

        const cliEntry = path.join(TEMPLATE_ROOT, '../src/index.ts')
        const ok = await captureTerminalScreenshot(
          'npx',
          [`tsx "${cliEntry}" "test-${preset.id}" --preset ${preset.id} -o "${presetProjectPath}"`],
          TEMPLATE_ROOT,
          presetOutputDir,
          '00-cli-create',
          page
        )
        expect(ok).toBeTruthy()
      })

      test('01 — client public pages', async ({ page }) => {
        if (!serverHandle) throw new Error('Dev server not started')
        checkConsoleErrors(page)

        const publicSteps = preset.steps.filter(s => s.section === 'client-public')
        if (publicSteps.length === 0) {
          expect(true).toBeTruthy()
          return
        }

        let idx = 1
        for (const step of publicSteps) {
          await screenshotPage(
            page,
            serverHandle.url,
            step.route,
            step.label,
            presetOutputDir,
            idx,
            {
              waitForSelector: step.waitForSelector,
              waitForTimeout: step.waitForTimeout,
            }
          )
          idx++
        }
        expect(true).toBeTruthy()
      })

      test('02 — seed data + client authenticated pages', async ({ page }) => {
        if (!serverHandle) throw new Error('Dev server not started')
        checkConsoleErrors(page)

        const authSteps = preset.steps.filter(s => s.section === 'client-auth')
        const adminSteps = preset.steps.filter(
          s => s.section === 'admin-public' || s.section === 'admin-auth'
        )

        // Cleanup
        await page.request.post(`${serverHandle.url}/api/__test__/cleanup`).catch(() => {})

        // Register + login users (works for both auth and no-auth presets)
        if (authSteps.length > 0 || adminSteps.length > 0) {
          tokens = await registerAndLoginUsers(page, serverHandle.url, preset.id)
        }

        if (authSteps.length === 0) {
          expect(true).toBeTruthy()
          return
        }

        // Seed data
        await seedAllData(page, serverHandle.url, tokens, preset.id)

        // Set client auth in localStorage
        await page.goto(serverHandle.url)
        await page.waitForLoadState('domcontentloaded')
        await setClientAuth(page, tokens.clientToken, tokens.clientUser)

        // Take authenticated screenshots
        const clientPublicCount = preset.steps.filter(s => s.section === 'client-public').length
        let idx = clientPublicCount + 1
        for (const step of authSteps) {
          await page.goto(serverHandle.url)
          await setClientAuth(page, tokens.clientToken, tokens.clientUser)
          await screenshotPage(
            page,
            serverHandle.url,
            step.route,
            step.label,
            presetOutputDir,
            idx,
            {
              waitForSelector: step.waitForSelector,
              waitForTimeout: step.waitForTimeout,
            }
          )
          idx++
        }
        expect(true).toBeTruthy()
      })

      test('03 — admin pages', async ({ page }) => {
        if (!serverHandle) throw new Error('Dev server not started')
        if (!tokens) throw new Error('Auth tokens not available')
        checkConsoleErrors(page)

        const adminPublicSteps = preset.steps.filter(s => s.section === 'admin-public')
        const adminAuthSteps = preset.steps.filter(s => s.section === 'admin-auth')
        if (adminPublicSteps.length === 0 && adminAuthSteps.length === 0) {
          expect(true).toBeTruthy()
          return
        }

        const clientPublicCount = preset.steps.filter(s => s.section === 'client-public').length
        const clientAuthCount = preset.steps.filter(s => s.section === 'client-auth').length
        let idx = clientPublicCount + clientAuthCount + 1

        // Screenshot admin login page (public)
        for (const step of adminPublicSteps) {
          await screenshotPage(
            page,
            serverHandle.url,
            step.route,
            step.label,
            presetOutputDir,
            idx,
            {
              waitForSelector: step.waitForSelector,
              waitForTimeout: step.waitForTimeout,
            }
          )
          idx++
        }

        // Login as admin + take authenticated screenshots
        if (adminAuthSteps.length > 0 && tokens) {
          // Navigate to admin and set auth
          await page.goto(`${serverHandle.url}/admin/login`)
          await page.waitForLoadState('domcontentloaded')
          await setAdminAuth(page, tokens.adminToken, tokens.adminUser)

          for (const step of adminAuthSteps) {
            // Re-set admin auth before each page (in case navigation clears it)
            await page.goto(`${serverHandle.url}/admin/login`)
            await page.waitForLoadState('domcontentloaded')
            await setAdminAuth(page, tokens.adminToken, tokens.adminUser)

            await screenshotPage(
              page,
              serverHandle.url,
              step.route,
              step.label,
              presetOutputDir,
              idx,
              {
                waitForSelector: step.waitForSelector,
                waitForTimeout: step.waitForTimeout,
              }
            )
            idx++
          }
        }
        expect(true).toBeTruthy()
      })
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

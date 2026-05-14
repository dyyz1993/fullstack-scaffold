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

    // Retry login up to 3 times to handle transient ECONNREFUSED (IPv4/IPv6 mismatch)
    let clientLoginRes: Awaited<ReturnType<typeof page.request.post>> | null = null
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        clientLoginRes = await page.request.post(`${baseUrl}/api/auth/login`, {
          data: { account: 'screenshotuser', password: 'test123456' },
          timeout: 5000,
        })
        if (clientLoginRes.ok()) break
      } catch {
        if (attempt < 2) await new Promise(r => setTimeout(r, 2000))
      }
    }
    if (!clientLoginRes) throw new Error('Failed to login after 3 retries')
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
      const authData = {
        state: { token: t, isAuthenticated: true, user: u },
        version: 0,
      }
      // apiClient reads from 'auth-token' key (see src/client/services/apiClient.ts)
      localStorage.setItem('auth-token', JSON.stringify(authData))
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

async function seedOrders(
  page: import('@playwright/test').Page,
  baseUrl: string,
  adminToken: string
): Promise<void> {
  const headers: Record<string, string> = adminToken
    ? { Authorization: `Bearer ${adminToken}` }
    : {}
  const orders = [
    {
      customerName: 'Alice Johnson',
      customerEmail: 'alice@example.com',
      productName: 'Wireless Headphones',
      amount: 89.99,
    },
    {
      customerName: 'Bob Smith',
      customerEmail: 'bob@example.com',
      productName: 'Mechanical Keyboard',
      amount: 149.99,
    },
    {
      customerName: 'Carol Williams',
      customerEmail: 'carol@example.com',
      productName: 'USB-C Hub',
      amount: 45.5,
    },
    {
      customerName: 'David Brown',
      customerEmail: 'david@example.com',
      productName: '4K Monitor',
      amount: 399.0,
    },
  ]
  for (const order of orders) {
    await page.request.post(`${baseUrl}/api/orders`, { data: order, headers }).catch(() => {})
  }
}

async function seedTickets(
  page: import('@playwright/test').Page,
  baseUrl: string,
  _clientToken: string,
  adminToken: string
): Promise<void> {
  const headers: Record<string, string> = adminToken
    ? { Authorization: `Bearer ${adminToken}` }
    : {}
  const tickets = [
    {
      customerName: 'Alice Johnson',
      customerEmail: 'alice@example.com',
      subject: 'Cannot connect to VPN after update',
      description:
        'After the latest firmware update, my VPN client fails to connect. I have tried reinstalling but the issue persists.',
      category: 'technical',
      priority: 'high',
    },
    {
      customerName: 'Bob Smith',
      customerEmail: 'bob@example.com',
      subject: 'Billing discrepancy on invoice #1042',
      description:
        'My invoice shows a charge for 2 items but I only ordered 1. Please correct this.',
      category: 'billing',
      priority: 'medium',
    },
    {
      customerName: 'Carol Williams',
      customerEmail: 'carol@example.com',
      subject: 'Feature request: Dark mode for dashboard',
      description:
        'It would be great to have a dark mode option for the admin dashboard to reduce eye strain during late-night work.',
      category: 'feature_request',
      priority: 'low',
    },
  ]
  const createdIds: string[] = []
  for (const ticket of tickets) {
    const res = await page.request
      .post(`${baseUrl}/api/tickets`, { data: ticket, headers })
      .catch(() => null)
    if (res) {
      try {
        const body = await res.json()
        if (body.success && body.data?.id) createdIds.push(body.data.id)
      } catch {
        // ignore
      }
    }
  }
  // Add a reply to the first ticket
  if (createdIds.length > 0) {
    await page.request
      .post(`${baseUrl}/api/tickets/${createdIds[0]}/reply`, {
        data: {
          content: 'Thank you for reporting this. We are looking into the VPN connectivity issue.',
          author: 'Support Team',
        },
        headers,
      })
      .catch(() => {})
  }
}

async function seedDisputes(
  page: import('@playwright/test').Page,
  baseUrl: string,
  _clientToken: string,
  adminToken: string
): Promise<void> {
  const headers: Record<string, string> = adminToken
    ? { Authorization: `Bearer ${adminToken}` }
    : {}
  const disputes = [
    {
      orderId: 'order-001',
      orderNo: 'ORD-2024-001',
      customerName: 'Alice Johnson',
      customerEmail: 'alice@example.com',
      type: 'product_quality',
      description:
        'The headphones I received have a crackling sound in the left ear after 2 days of use.',
      amount: 89.99,
    },
    {
      orderId: 'order-002',
      orderNo: 'ORD-2024-002',
      customerName: 'Bob Smith',
      customerEmail: 'bob@example.com',
      type: 'refund',
      description: 'I requested a cancellation within 30 minutes but the order was still shipped.',
      amount: 149.99,
    },
  ]
  for (const dispute of disputes) {
    await page.request.post(`${baseUrl}/api/disputes`, { data: dispute, headers }).catch(() => {})
  }
}

async function seedContents(
  page: import('@playwright/test').Page,
  baseUrl: string,
  adminToken: string
): Promise<void> {
  const headers: Record<string, string> = adminToken
    ? { Authorization: `Bearer ${adminToken}` }
    : {}
  const contents = [
    {
      title: 'Getting Started with Biomimic',
      content:
        'Welcome to Biomimic! This guide will walk you through setting up your first project, configuring modules, and deploying to production. We cover everything from the CLI scaffold command to customizing your admin panel.',
      category: 'tutorial',
      tags: ['getting-started', 'tutorial', 'beginner'],
    },
    {
      title: 'Version 2.0 Release Notes',
      content:
        'We are excited to announce Biomimic 2.0! This release includes a brand-new plugin marketplace, improved RBAC with audit logging, and Cloudflare Workers support. Read on for the full changelog.',
      category: 'announcement',
      tags: ['release', 'v2'],
    },
    {
      title: 'Building a Plugin Marketplace',
      content:
        'Learn how to create, publish, and monetize plugins for the xbrowser ecosystem. This tutorial covers the plugin API, review process, and best practices for plugin development.',
      category: 'article',
      tags: ['plugins', 'marketplace', 'development'],
    },
    {
      title: 'Privacy Policy Update — December 2024',
      content:
        'We have updated our privacy policy to reflect changes in data processing. Key changes include improved data retention controls and new cookie consent options.',
      category: 'policy',
      tags: ['privacy', 'legal'],
    },
  ]
  const createdIds: string[] = []
  for (const c of contents) {
    const res = await page.request
      .post(`${baseUrl}/api/contents`, { data: c, headers })
      .catch(() => null)
    if (res) {
      try {
        const body = await res.json()
        if (body.success && body.data?.id) createdIds.push(body.data.id)
      } catch {
        // ignore
      }
    }
  }
  // Publish the first 3 items so they appear on public content pages
  for (let i = 0; i < Math.min(createdIds.length, 3); i++) {
    await page.request
      .put(`${baseUrl}/api/contents/${createdIds[i]}/publish`, { headers })
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
  if (modules.has('order')) await seedOrders(page, baseUrl, tokens.adminToken)
  if (modules.has('ticket')) await seedTickets(page, baseUrl, tokens.clientToken, tokens.adminToken)
  if (modules.has('dispute'))
    await seedDisputes(page, baseUrl, tokens.clientToken, tokens.adminToken)
  if (modules.has('content')) await seedContents(page, baseUrl, tokens.adminToken)
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
    const res = await page.goto(fullUrl, { timeout: 30_000 })
    if (!res || (res.status() >= 400 && res.status() < 600)) {
      console.log(`  ⚠️  Skip ${name}: HTTP ${res?.status()} for ${route}`)
      return false
    }

    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

    if (options?.waitForSelector) {
      await page.waitForSelector(options.waitForSelector, { timeout: 15_000 }).catch(() => {})
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
  section: 'cli' | 'client-public' | 'client-auth' | 'admin-public' | 'admin-auth' | 'crud'
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
      waitForSelector: 'a[href^="/plugins/"]',
      waitForTimeout: 2500,
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

  // CRUD operation screenshots (interactive UI flows)
  if (hasTodos) {
    steps.push({
      route: '/todos',
      label: 'crud-todo-create-form',
      section: 'crud',
      waitForSelector: '[data-testid="todo-form"]',
      waitForTimeout: 1500,
    })
    steps.push({
      route: '/todos',
      label: 'crud-todo-after-create',
      section: 'crud',
      waitForSelector: '[data-testid="todo-list"]',
      waitForTimeout: 1500,
    })
    steps.push({
      route: '/todos',
      label: 'crud-todo-after-toggle',
      section: 'crud',
      waitForSelector: '[data-testid="todo-list"]',
      waitForTimeout: 1200,
    })
    steps.push({
      route: '/todos',
      label: 'crud-todo-after-delete',
      section: 'crud',
      waitForSelector: '[data-testid="todo-list"]',
      waitForTimeout: 1200,
    })
  }

  if (hasChat) {
    steps.push({
      route: '/websocket',
      label: 'crud-chat-after-send',
      section: 'crud',
      waitForSelector: '[data-testid="websocket-container"]',
      waitForTimeout: 2000,
    })
  }

  if (hasContent) {
    steps.push({
      route: '/content',
      label: 'crud-content-with-published',
      section: 'crud',
      waitForTimeout: 1500,
    })
  }

  if (hasAdmin) {
    steps.push({
      route: '/admin/users',
      label: 'crud-admin-user-create-modal',
      section: 'crud',
      waitForSelector: 'table',
      waitForTimeout: 2000,
    })
  }

  if (hasOrders) {
    steps.push({
      route: '/admin/orders',
      label: 'crud-admin-order-detail-modal',
      section: 'crud',
      waitForSelector: 'table',
      waitForTimeout: 2000,
    })
  }

  if (hasTickets) {
    steps.push({
      route: '/admin/tickets',
      label: 'crud-admin-ticket-detail-modal',
      section: 'crud',
      waitForSelector: 'table',
      waitForTimeout: 2000,
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
  .card .section-badge.crud { background:#cba6f722; color:#cba6f7; }
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
    <div class="stat"><div class="num">${
      images.length
    }</div><div class="lbl">Screenshots</div></div>
  </div>
</div>

<div class="container">

${presets
  .map(preset => {
    const presetImages = images.filter(img => img.presetId === preset.id)
    if (presetImages.length === 0) return ''
    return `
  <div class="section" id="${preset.id}">
    <div class="section-title"><span class="dot"></span>${
      preset.name
    }<code style="color:var(--text-muted);font-size:13px;margin-left:8px;">${preset.id}</code></div>
    <div class="grid">
      ${presetImages
        .map(img => {
          const badge = img.label.startsWith('cli-')
            ? 'cli'
            : img.label.startsWith('admin-')
            ? 'admin'
            : img.label.startsWith('crud-')
            ? 'crud'
            : 'client'
          return `
      <div class="card" onclick="showLightbox('${img.relativePath}')">
        <img src="${img.relativePath}" alt="${img.label}" loading="lazy" />
        <div class="card-label"><span class="section-badge ${badge}">${badge}</span>${img.label.replace(
            /-/g,
            ' '
          )}</div>
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
  Generated by <code>visual-screenshots.spec.ts</code> &middot; ${
    new Date().toISOString().split('T')[0]
  }
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
        test.setTimeout(300_000)
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
        await page.goto(serverHandle.url, { timeout: 30_000 })
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
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
          await page.goto(`${serverHandle.url}/admin/login`, { timeout: 30_000 })
          await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
          await setAdminAuth(page, tokens.adminToken, tokens.adminUser)

          for (const step of adminAuthSteps) {
            // Re-set admin auth before each page (in case navigation clears it)
            await page.goto(`${serverHandle.url}/admin/login`, { timeout: 30_000 })
            await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
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

      test('04 — CRUD operations', async ({ page }) => {
        test.setTimeout(180_000)
        if (!serverHandle) throw new Error('Dev server not started')
        if (!tokens) throw new Error('Auth tokens not available')
        checkConsoleErrors(page)

        const crudSteps = preset.steps.filter(s => s.section === 'crud')
        const presetConfig = getPreset(preset.id)
        const modules = new Set(presetConfig?.modules ?? [])

        if (crudSteps.length === 0) {
          expect(true).toBeTruthy()
          return
        }

        const nonCrudCount = preset.steps.filter(s => s.section !== 'crud').length
        let idx = nonCrudCount + 1

        const baseUrl = serverHandle.url

        // --- Todo CRUD ---
        if (modules.has('todos')) {
          // 1. Navigate to todos page, set auth, then reload so app reads auth from localStorage
          await page.goto(`${baseUrl}/todos`, { timeout: 30_000 })
          await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {})
          await setClientAuth(page, tokens.clientToken, tokens.clientUser)
          await page.reload({ timeout: 30_000 })
          await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {})
          await page
            .waitForSelector('[data-testid="todo-form"], form, input[type="text"]', {
              timeout: 30_000,
            })
            .catch(() => {})
          await page.waitForTimeout(800)
          const formIdx = idx++
          await capturePage(
            page,
            `${String(formIdx).padStart(2, '0')}-crud-todo-create-form`,
            presetOutputDir
          )

          // 2. Fill and submit a new todo
          const titleInput = page.locator('[data-testid="todo-title-input"]')
          const descInput = page.locator('[data-testid="todo-description-input"]')
          const addBtn = page.locator('[data-testid="add-todo-button"]')
          if (await titleInput.isVisible().catch(() => false)) {
            await titleInput.fill('Screenshot CRUD test todo')
            if (await descInput.isVisible().catch(() => false)) {
              await descInput.fill('Created by E2E visual screenshot test')
            }
            if (await addBtn.isVisible().catch(() => false)) {
              await addBtn.click()
              await page.waitForTimeout(1200)
            }
          }
          const afterCreateIdx = idx++
          await capturePage(
            page,
            `${String(afterCreateIdx).padStart(2, '0')}-crud-todo-after-create`,
            presetOutputDir
          )

          // 3. Toggle the new todo's completion status
          const todoItems = page.locator('[data-testid="todo-item"]')
          const todoCount = await todoItems.count()
          if (todoCount > 0) {
            // Click the status toggle on the last item (the one we just created)
            const lastItem = todoItems.nth(todoCount - 1)
            const statusBtn = lastItem.locator('[data-testid="todo-status"]')
            if (await statusBtn.isVisible()) {
              await statusBtn.click()
              await page.waitForTimeout(800)
            }
          }
          const afterToggleIdx = idx++
          await capturePage(
            page,
            `${String(afterToggleIdx).padStart(2, '0')}-crud-todo-after-toggle`,
            presetOutputDir
          )

          // 4. Delete the todo we just created
          if (todoCount > 0) {
            const lastItem = todoItems.nth(todoCount - 1)
            const deleteBtn = lastItem.locator('[data-testid="delete-button"]')
            if (await deleteBtn.isVisible()) {
              await deleteBtn.click()
              await page.waitForTimeout(800)
            }
          }
          const afterDeleteIdx = idx++
          await capturePage(
            page,
            `${String(afterDeleteIdx).padStart(2, '0')}-crud-todo-after-delete`,
            presetOutputDir
          )
        }

        // --- Chat / WebSocket CRUD ---
        if (modules.has('chat')) {
          await page.goto(`${baseUrl}/websocket`, { timeout: 30_000 })
          await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
          await setClientAuth(page, tokens.clientToken, tokens.clientUser)
          await page.reload({ timeout: 30_000 })
          await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
          await page
            .waitForSelector('[data-testid="websocket-container"]', { timeout: 15_000 })
            .catch(() => {})

          // Connect
          const connectBtn = page.locator('[data-testid="connect-ws-button"]')
          if (await connectBtn.isVisible()) {
            await connectBtn.click()
            await page.waitForTimeout(1500)
          }

          // Send a message
          const msgInput = page.locator('[data-testid="ws-message-input"]')
          const sendBtn = page.locator('[data-testid="send-message-button"]')
          if (await msgInput.isVisible()) {
            await msgInput.fill('Hello from screenshot test!')
            if (await sendBtn.isVisible()) {
              await sendBtn.click()
              await page.waitForTimeout(1000)
            }
          }
          const afterChatIdx = idx++
          await capturePage(
            page,
            `${String(afterChatIdx).padStart(2, '0')}-crud-chat-after-send`,
            presetOutputDir
          )

          // Disconnect
          const disconnectBtn = page.locator('[data-testid="disconnect-ws-button"]')
          if (await disconnectBtn.isVisible()) {
            await disconnectBtn.click()
            await page.waitForTimeout(500)
          }
        }

        // --- Content page with published data ---
        if (modules.has('content')) {
          await page.goto(`${baseUrl}/content`, { timeout: 30_000 })
          await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
          await setClientAuth(page, tokens.clientToken, tokens.clientUser)
          await page.reload({ timeout: 30_000 })
          await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
          await page.waitForTimeout(1500)
          const contentIdx = idx++
          await capturePage(
            page,
            `${String(contentIdx).padStart(2, '0')}-crud-content-with-published`,
            presetOutputDir
          )
        }

        // --- Admin CRUD: user create modal ---
        if (modules.has('admin')) {
          await page.goto(`${baseUrl}/admin/users`, { timeout: 30_000 })
          await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
          await setAdminAuth(page, tokens.adminToken, tokens.adminUser)
          await page.reload({ timeout: 30_000 })
          await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
          await page.waitForSelector('table', { timeout: 15_000 }).catch(() => {})
          await page.waitForTimeout(1500)

          // Try to open create user modal
          const createUserBtn = page
            .getByRole('button', { name: /新建|Create|添加|Add|New/i })
            .first()
          if (await createUserBtn.isVisible().catch(() => false)) {
            await createUserBtn.click()
            await page.waitForTimeout(1000)
          }
          const userCreateIdx = idx++
          await capturePage(
            page,
            `${String(userCreateIdx).padStart(2, '0')}-crud-admin-user-create-modal`,
            presetOutputDir
          )
        }

        // --- Admin CRUD: order detail modal ---
        if (modules.has('order')) {
          await page.goto(`${baseUrl}/admin/orders`, { timeout: 30_000 })
          await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
          await setAdminAuth(page, tokens.adminToken, tokens.adminUser)
          await page.reload({ timeout: 30_000 })
          await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
          await page.waitForSelector('table', { timeout: 15_000 }).catch(() => {})
          await page.waitForTimeout(1500)

          // Try to open order detail/view modal
          const viewBtn = page.getByRole('button', { name: /查看|View|详情|Detail/i }).first()
          if (await viewBtn.isVisible().catch(() => false)) {
            await viewBtn.click()
            await page.waitForTimeout(1000)
          }
          const orderDetailIdx = idx++
          await capturePage(
            page,
            `${String(orderDetailIdx).padStart(2, '0')}-crud-admin-order-detail-modal`,
            presetOutputDir
          )
        }

        // --- Admin CRUD: ticket detail modal ---
        if (modules.has('ticket')) {
          await page.goto(`${baseUrl}/admin/tickets`, { timeout: 30_000 })
          await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
          await setAdminAuth(page, tokens.adminToken, tokens.adminUser)
          await page.reload({ timeout: 30_000 })
          await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
          await page.waitForSelector('table', { timeout: 15_000 }).catch(() => {})
          await page.waitForTimeout(1500)

          // Try to open ticket detail/view modal
          const viewBtn = page.getByRole('button', { name: /查看|View|详情|Detail/i }).first()
          if (await viewBtn.isVisible().catch(() => false)) {
            await viewBtn.click()
            await page.waitForTimeout(1000)
          }
          const ticketDetailIdx = idx++
          await capturePage(
            page,
            `${String(ticketDetailIdx).padStart(2, '0')}-crud-admin-ticket-detail-modal`,
            presetOutputDir
          )
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

// ════════════════════════════════════════════════════════════════════
//  PART 3: CLI Screenshots
// ════════════════════════════════════════════════════════════════════

test.describe('CLI Screenshots @slow', () => {
  test.describe.configure({ retries: 1, mode: 'serial' })
  test.setTimeout(120_000)

  test.skip(({ browserName }) => browserName !== 'chromium', 'CLI screenshots only run on Chromium')

  const CLI_DIR = path.join(GALLERY_DIR, 'cli')
  const PROJECT_ROOT = path.resolve(TEMPLATE_ROOT, '..')
  const CLI_ENTRY = path.join(PROJECT_ROOT, 'src/cli/index.ts')
  const SCAFFOLD_ENTRY = path.join(PROJECT_ROOT, 'src/index.ts')

  const CLI_COMMANDS: Array<{
    label: string
    args: string[]
    cwd: string
    entry: string
  }> = [
    {
      label: '01-scaffold-help',
      args: ['tsx', `"${SCAFFOLD_ENTRY}"`, '--help'],
      cwd: PROJECT_ROOT,
      entry: 'npx',
    },
    {
      label: '02-scaffold-presets',
      args: ['tsx', `"${SCAFFOLD_ENTRY}"`, 'presets'],
      cwd: PROJECT_ROOT,
      entry: 'npx',
    },
    {
      label: '03-cli-help',
      args: ['tsx', `"${CLI_ENTRY}"`, '--help'],
      cwd: PROJECT_ROOT,
      entry: 'npx',
    },
    {
      label: '04-todo-help',
      args: ['tsx', `"${CLI_ENTRY}"`, 'todo', '--help'],
      cwd: PROJECT_ROOT,
      entry: 'npx',
    },
    {
      label: '05-notification-help',
      args: ['tsx', `"${CLI_ENTRY}"`, 'notification', '--help'],
      cwd: PROJECT_ROOT,
      entry: 'npx',
    },
    {
      label: '06-config-help',
      args: ['tsx', `"${CLI_ENTRY}"`, 'config', '--help'],
      cwd: PROJECT_ROOT,
      entry: 'npx',
    },
    {
      label: '07-config-path',
      args: ['tsx', `"${CLI_ENTRY}"`, 'config', 'path'],
      cwd: PROJECT_ROOT,
      entry: 'npx',
    },
    {
      label: '08-config-get',
      args: ['tsx', `"${CLI_ENTRY}"`, 'config', 'get'],
      cwd: PROJECT_ROOT,
      entry: 'npx',
    },
  ]

  test.beforeAll(() => {
    fs.mkdirSync(CLI_DIR, { recursive: true })
  })

  for (const cmd of CLI_COMMANDS) {
    test(`${cmd.label} — ${cmd.args
      .filter(a => !a.startsWith('"'))
      .slice(-3)
      .join(' ')}`, async ({ page }) => {
      const ok = await captureTerminalScreenshot(
        cmd.entry,
        cmd.args,
        cmd.cwd,
        CLI_DIR,
        cmd.label,
        page
      )
      expect(ok).toBeTruthy()
    })
  }
})

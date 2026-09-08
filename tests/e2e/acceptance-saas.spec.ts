import { test, expect } from '@playwright/test'
import { validateArrayDeep, type FieldSpec } from '../lib/recursive-validator'

const TODO_SPEC: FieldSpec = {
  type: 'object',
  fields: {
    id: { type: 'number' },
    title: { type: 'string', minLength: 1 },
    completed: { type: 'boolean' },
    createdAt: { type: 'string', minLength: 1 },
  },
}

const DASHBOARD_STAT_SPEC: FieldSpec = {
  type: 'object',
  fields: {
    label: { type: 'string', minLength: 1 },
    value: { type: 'string', minLength: 1 },
    trend: { type: 'number' },
  },
}

const REVENUE_DATA_SPEC: FieldSpec = {
  type: 'object',
  fields: {
    month: { type: 'string', minLength: 1 },
    value: { type: 'number', min: 0 },
  },
}

const ACTIVITY_SPEC: FieldSpec = {
  type: 'object',
  fields: {
    id: { type: 'number' },
    user: { type: 'string', minLength: 1 },
    action: { type: 'string', minLength: 1 },
    date: { type: 'string', minLength: 1 },
    status: { type: 'string', enum: ['Active', 'Pending', 'Inactive'] },
  },
}

const ROLE_INFO_SPEC: FieldSpec = {
  type: 'object',
  fields: {
    role: { type: 'string', minLength: 1 },
    label: { type: 'string', minLength: 1 },
    permissions: { type: 'array', items: { type: 'string', minLength: 1 } },
  },
}

const PERMISSION_INFO_SPEC: FieldSpec = {
  type: 'object',
  fields: {
    permission: { type: 'string', minLength: 1 },
    label: { type: 'string', minLength: 1 },
    category: { type: 'string', minLength: 1 },
  },
}

const MENU_ITEM_SPEC: FieldSpec = {
  type: 'object',
  fields: {
    path: { type: 'string', minLength: 1 },
    label: { type: 'string', minLength: 1 },
    icon: { type: 'string', minLength: 1 },
    permissions: { type: 'array', items: { type: 'string', minLength: 1 } },
  },
  allowExtraFields: true,
}

const BASE_URL = 'https://saas.shanbox.19930810.xyz:8443'

test.describe('SaaS - Acceptance', () => {
  test.slow()

  test('todos API returns data', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/todos`)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.length).toBeGreaterThanOrEqual(1)
  })

  test('every todo passes recursive field validation', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/todos`)
    const body = await res.json()
    const result = validateArrayDeep(body.data, TODO_SPEC, 'Todo')
    console.error(
      `SaaS Todos: ${result.totalObjects} objects, ${result.totalAssertions} assertions`
    )
    expect(result.passed, result.errors.join('\n')).toBe(true)
  })

  test('dashboard stats API returns valid stats', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/admin/dashboard/stats`)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.stats).toBeDefined()

    const statsResult = validateArrayDeep(body.data.stats, DASHBOARD_STAT_SPEC, 'DashboardStat')
    console.error(
      `SaaS Dashboard Stats: ${statsResult.totalObjects} objects, ${statsResult.totalAssertions} assertions`
    )
    expect(statsResult.passed, statsResult.errors.join('\n')).toBe(true)
  })

  test('dashboard revenue data passes validation', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/admin/dashboard/stats`)
    const body = await res.json()

    const revenueResult = validateArrayDeep(body.data.revenue, REVENUE_DATA_SPEC, 'Revenue')
    console.error(
      `SaaS Revenue: ${revenueResult.totalObjects} objects, ${revenueResult.totalAssertions} assertions`
    )
    expect(revenueResult.passed, revenueResult.errors.join('\n')).toBe(true)
  })

  test('dashboard user growth data passes validation', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/admin/dashboard/stats`)
    const body = await res.json()

    const growthResult = validateArrayDeep(body.data.userGrowth, REVENUE_DATA_SPEC, 'UserGrowth')
    console.error(
      `SaaS UserGrowth: ${growthResult.totalObjects} objects, ${growthResult.totalAssertions} assertions`
    )
    expect(growthResult.passed, growthResult.errors.join('\n')).toBe(true)
  })

  test('dashboard activity data passes validation', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/admin/dashboard/stats`)
    const body = await res.json()

    const activityResult = validateArrayDeep(body.data.activity, ACTIVITY_SPEC, 'Activity')
    console.error(
      `SaaS Activity: ${activityResult.totalObjects} objects, ${activityResult.totalAssertions} assertions`
    )
    expect(activityResult.passed, activityResult.errors.join('\n')).toBe(true)
    expect(activityResult.totalObjects).toBeGreaterThanOrEqual(3)
  })

  test('permissions roles API passes recursive validation', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/permissions/roles`)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.length).toBeGreaterThanOrEqual(1)

    const result = validateArrayDeep(body.data, ROLE_INFO_SPEC, 'RoleInfo')
    console.error(
      `SaaS Roles: ${result.totalObjects} objects, ${result.totalAssertions} assertions`
    )
    expect(result.passed, result.errors.join('\n')).toBe(true)
  })

  test('permissions list API passes recursive validation', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/permissions`)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.length).toBeGreaterThanOrEqual(1)

    const result = validateArrayDeep(body.data, PERMISSION_INFO_SPEC, 'PermissionInfo')
    console.error(
      `SaaS Permissions: ${result.totalObjects} objects, ${result.totalAssertions} assertions`
    )
    expect(result.passed, result.errors.join('\n')).toBe(true)
  })

  test('permissions menu-config passes recursive validation', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/permissions/menu-config`)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.length).toBeGreaterThanOrEqual(1)

    const result = validateArrayDeep(body.data, MENU_ITEM_SPEC, 'MenuItem')
    console.error(
      `SaaS MenuConfig: ${result.totalObjects} objects, ${result.totalAssertions} assertions`
    )
    expect(result.passed, result.errors.join('\n')).toBe(true)
  })

  test('permissions categories API returns valid structure', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/permissions/categories`)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toBeDefined()
    expect(typeof body.data).toBe('object')
    const keys = Object.keys(body.data)
    expect(keys.length).toBeGreaterThanOrEqual(1)
  })

  test('permissions role-labels API returns valid structure', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/permissions/role-labels`)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toBeDefined()
    expect(typeof body.data).toBe('object')
  })

  test('permissions page-permissions API passes validation', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/permissions/page-permissions`)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBeGreaterThanOrEqual(1)
  })

  test('health endpoint returns valid structure', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/health`)
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.status).toBe('ok')
  })
})

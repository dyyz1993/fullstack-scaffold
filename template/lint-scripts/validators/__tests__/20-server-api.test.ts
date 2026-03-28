/**
 * Server API 规则测试
 *
 * 验证 Server API 规则文档中描述的代码模式
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const TEMPLATE_ROOT = join(__dirname, '..', '..', '..', '..', 'template')
const RULE_DOCS_DIR = join(TEMPLATE_ROOT, '.claude', 'rules')

interface RuleCheckResult {
  ruleName: string
  passed: boolean
  violations: string[]
  docLink: string
}

function checkMiddlewareLocation(content: string, filePath: string): RuleCheckResult {
  const violations: string[] = []

  const hasMiddlewarePattern =
    content.includes('MiddlewareHandler') ||
    /\(c,\s*next\)\s*=>/.test(content) ||
    /async\s*\(\s*c\s*,\s*next\s*\)/.test(content)

  if (hasMiddlewarePattern) {
    const validMiddlewarePath = /src\/server\/middleware\//.test(filePath)
    if (!validMiddlewarePath) {
      violations.push('中间件必须放在 src/server/middleware/ 目录')
    }
  }

  return {
    ruleName: 'middleware-location',
    passed: violations.length === 0,
    violations,
    docLink: '.claude/rules/20-server-api.md#middleware',
  }
}

function checkRouteDefinition(content: string, filePath: string): RuleCheckResult {
  const violations: string[] = []

  if (filePath.includes('/routes/')) {
    if (!content.includes('openapi(')) {
      violations.push('路由文件必须使用 openapi() 函数')
    }

    if (content.includes('.use(') && !content.includes('createApp')) {
      violations.push('路由文件中不应应用中间件，应在 app.ts 中应用')
    }

    if (
      content.includes('getDb()') ||
      content.includes('db.select') ||
      content.includes('db.insert')
    ) {
      violations.push('路由文件不应直接访问数据库，应调用 Service')
    }
  }

  return {
    ruleName: 'route-definition',
    passed: violations.length === 0,
    violations,
    docLink: '.claude/rules/20-server-api.md#routes',
  }
}

function checkServiceDefinition(content: string, filePath: string): RuleCheckResult {
  const violations: string[] = []

  if (filePath.includes('/services/')) {
    if (content.includes('openapi(') || content.includes('OpenAPIHono')) {
      violations.push('Service 文件不应包含路由定义')
    }

    if (content.includes('c.req') || content.includes('c.json')) {
      violations.push('Service 文件不应使用 Hono Context')
    }

    const hasUtilFunction = /function\s+\w+\s*\([^)]*\)\s*{[^}]*return[^}]*}/.test(content)
    if (hasUtilFunction && !content.includes('export')) {
      violations.push('Service 文件不应包含未导出的工具函数')
    }
  }

  return {
    ruleName: 'service-definition',
    passed: violations.length === 0,
    violations,
    docLink: '.claude/rules/20-server-api.md#service',
  }
}

function checkLayerBoundary(content: string, filePath: string): RuleCheckResult {
  const violations: string[] = []

  const isBusinessLayer = filePath.includes('/module-') || filePath.includes('/client/')

  const isFrameworkLayer =
    filePath.includes('/core/') ||
    filePath.includes('/entries/') ||
    filePath.includes('/test-utils/')

  if (isBusinessLayer) {
    if (
      content.includes('@framework-modify') &&
      !content.includes('@framework-allow-modification')
    ) {
      violations.push('业务层修改框架层需要添加 @framework-allow-modification 注释')
    }
  }

  return {
    ruleName: 'layer-boundary',
    passed: violations.length === 0,
    violations,
    docLink: '.claude/rules/20-server-api.md#layer-boundary',
  }
}

describe('Server API Rules Documentation Tests', () => {
  it('should have server-api rule file', () => {
    const ruleFile = join(RULE_DOCS_DIR, '20-server-api.md')
    expect(existsSync(ruleFile)).toBe(true)
  })
})

describe('Middleware Location Rule', () => {
  it('should pass when middleware is in correct directory', () => {
    const validMiddleware = `
export function authMiddleware(options?: AuthMiddlewareOptions): MiddlewareHandler {
  return async (c, next) => {
    await next()
  }
}
`
    const result = checkMiddlewareLocation(validMiddleware, 'src/server/middleware/auth.ts')
    expect(result.passed).toBe(true)
  })

  it('should fail when middleware is in wrong directory', () => {
    const invalidMiddleware = `
export function authMiddleware() {
  return async (c, next) => {
    await next()
  }
}
`
    const result = checkMiddlewareLocation(
      invalidMiddleware,
      'src/server/module-todos/middleware/auth.ts'
    )
    expect(result.passed).toBe(false)
    expect(result.violations).toContain('中间件必须放在 src/server/middleware/ 目录')
  })
})

describe('Route Definition Rule', () => {
  it('should pass valid route file', () => {
    const validRoute = `
import { createRoute } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'

const listRoute = createRoute({
  method: 'get',
  path: '/items',
  responses: {
    200: { description: 'Success' },
  },
})

export const apiRoutes = new OpenAPIHono()
  .openapi(listRoute, async c => {
    const items = await listItems()
    return c.json({ success: true, data: items })
  })
`
    const result = checkRouteDefinition(
      validRoute,
      'src/server/module-todos/routes/todos-routes.ts'
    )
    expect(result.passed).toBe(true)
  })

  it('should fail when route does not use openapi', () => {
    const invalidRoute = `
import { Hono } from 'hono'

export const apiRoutes = new Hono()
  .get('/items', async c => {
    return c.json({ items: [] })
  })
`
    const result = checkRouteDefinition(
      invalidRoute,
      'src/server/module-todos/routes/todos-routes.ts'
    )
    expect(result.passed).toBe(false)
    expect(result.violations).toContain('路由文件必须使用 openapi() 函数')
  })

  it('should fail when route applies middleware', () => {
    const routeWithMiddleware = `
import { OpenAPIHono } from '@hono/zod-openapi'
import { captchaMiddleware } from '@server/middleware/captcha'

export const adminRoutes = new OpenAPIHono()
  .use('*', captchaMiddleware())
  .openapi(listRoute, async c => { ... })
`
    const result = checkRouteDefinition(
      routeWithMiddleware,
      'src/server/module-admin/routes/admin-routes.ts'
    )
    expect(result.passed).toBe(false)
    expect(result.violations).toContain('路由文件中不应应用中间件，应在 app.ts 中应用')
  })

  it('should fail when route accesses database directly', () => {
    const routeWithDb = `
import { OpenAPIHono } from '@hono/zod-openapi'
import { getDb } from '../../db'

export const apiRoutes = new OpenAPIHono()
  .openapi(createRoute, async c => {
    const db = await getDb()
    const result = await db.insert(items).values(data)
    return c.json({ success: true, data: result[0] })
  })
`
    const result = checkRouteDefinition(
      routeWithDb,
      'src/server/module-todos/routes/todos-routes.ts'
    )
    expect(result.passed).toBe(false)
    expect(result.violations).toContain('路由文件不应直接访问数据库，应调用 Service')
  })
})

describe('Service Definition Rule', () => {
  it('should pass valid service file', () => {
    const validService = `
import type { Item, CreateItemInput } from '@shared/schemas'
import { getDb } from '../../db'

export async function listItems(): Promise<Item[]> {
  const db = await getDb()
  return db.select().from(items)
}

export async function createItem(input: CreateItemInput): Promise<Item> {
  const db = await getDb()
  const result = await db.insert(items).values(input).returning()
  return result[0]
}
`
    const result = checkServiceDefinition(
      validService,
      'src/server/module-todos/services/todo-service.ts'
    )
    expect(result.passed).toBe(true)
  })

  it('should fail when service contains route definition', () => {
    const serviceWithRoute = `
import { OpenAPIHono } from '@hono/zod-openapi'

export const apiRoutes = new OpenAPIHono()
  .openapi(listRoute, async c => { ... })

export async function listItems() {
  // ...
}
`
    const result = checkServiceDefinition(
      serviceWithRoute,
      'src/server/module-todos/services/todo-service.ts'
    )
    expect(result.passed).toBe(false)
    expect(result.violations).toContain('Service 文件不应包含路由定义')
  })

  it('should fail when service uses Hono Context', () => {
    const serviceWithContext = `
export async function createItem(c: Context) {
  const data = c.req.valid('json')
  // ...
}
`
    const result = checkServiceDefinition(
      serviceWithContext,
      'src/server/module-todos/services/todo-service.ts'
    )
    expect(result.passed).toBe(false)
    expect(result.violations).toContain('Service 文件不应使用 Hono Context')
  })
})

describe('Layer Boundary Rule', () => {
  it('should pass when business layer does not modify framework', () => {
    const validBusinessCode = `
import { createRPCHandler } from '@server/core/runtime'

export const customHandler = createRPCHandler('customMethod', handler)
`
    const result = checkLayerBoundary(
      validBusinessCode,
      'src/server/module-todos/services/custom-service.ts'
    )
    expect(result.passed).toBe(true)
  })

  it('should fail when business layer modifies framework without permission', () => {
    const invalidBusinessCode = `
import { runtime } from '@server/core/runtime'

// @framework-modify
runtime.registerRPC('customMethod', handler)
`
    const result = checkLayerBoundary(
      invalidBusinessCode,
      'src/server/module-todos/services/custom-service.ts'
    )
    expect(result.passed).toBe(false)
    expect(result.violations).toContain(
      '业务层修改框架层需要添加 @framework-allow-modification 注释'
    )
  })
})

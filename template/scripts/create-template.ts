/**
 * 路由和服务模板生成器
 *
 * 用法：
 *   npm run create:route <name>      创建路由文件
 *   npm run create:service <name>    创建服务文件
 *   npm run create:module <name>     创建完整模块（路由+服务+测试）
 *
 * 示例：
 *   npm run create:route user        -> src/server/routes/user-routes.ts
 *   npm run create:service user      -> src/server/services/user-service.ts
 *   npm run create:module product    -> src/server/module-product/
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const templateDir = path.resolve(__dirname, '..')

interface CreateOptions {
  type: 'route' | 'service' | 'module'
  name: string
}

function toPascalCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
}

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str)
  return pascal.charAt(0).toLowerCase() + pascal.slice(1)
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
}

function generateRouteTemplate(name: string): string {
  const pascalName = toPascalCase(name)
  const camelName = toCamelCase(name)
  const kebabName = toKebabCase(name)

  return `import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { ${camelName}Service } from '../services/${kebabName}-service'

export const ${camelName}Routes = new Hono()

${camelName}Routes.get(
  '/${kebabName}s',
  describeRoute({
    description: '获取${pascalName}列表',
    responses: {
      200: {
        description: '成功返回${pascalName}列表',
      },
    },
  }),
  async c => {
    const result = await ${camelName}Service.getAll()
    return c.json({
      success: true,
      data: result,
    })
  }
)

${camelName}Routes.get(
  '/${kebabName}s/:id',
  describeRoute({
    description: '根据ID获取${pascalName}',
    responses: {
      200: {
        description: '成功返回${pascalName}',
      },
      404: {
        description: '${pascalName}不存在',
      },
    },
  }),
  async c => {
    const id = c.req.param('id')
    const result = await ${camelName}Service.getById(id)

    if (!result) {
      return c.json(
        {
          success: false,
          error: '${pascalName}不存在',
        },
        404
      )
    }

    return c.json({
      success: true,
      data: result,
    })
  }
)

${camelName}Routes.post(
  '/${kebabName}s',
  describeRoute({
    description: '创建${pascalName}',
    responses: {
      201: {
        description: '成功创建${pascalName}',
      },
    },
  }),
  async c => {
    const body = await c.req.json()
    const result = await ${camelName}Service.create(body)

    return c.json(
      {
        success: true,
        data: result,
      },
      201
    )
  }
)

${camelName}Routes.put(
  '/${kebabName}s/:id',
  describeRoute({
    description: '更新${pascalName}',
    responses: {
      200: {
        description: '成功更新${pascalName}',
      },
      404: {
        description: '${pascalName}不存在',
      },
    },
  }),
  async c => {
    const id = c.req.param('id')
    const body = await c.req.json()
    const result = await ${camelName}Service.update(id, body)

    if (!result) {
      return c.json(
        {
          success: false,
          error: '${pascalName}不存在',
        },
        404
      )
    }

    return c.json({
      success: true,
      data: result,
    })
  }
)

${camelName}Routes.delete(
  '/${kebabName}s/:id',
  describeRoute({
    description: '删除${pascalName}',
    responses: {
      200: {
        description: '成功删除${pascalName}',
      },
      404: {
        description: '${pascalName}不存在',
      },
    },
  }),
  async c => {
    const id = c.req.param('id')
    const result = await ${camelName}Service.delete(id)

    if (!result) {
      return c.json(
        {
          success: false,
          error: '${pascalName}不存在',
        },
        404
      )
    }

    return c.json({
      success: true,
      message: '删除成功',
    })
  }
)
`
}

function generateServiceTemplate(name: string): string {
  const pascalName = toPascalCase(name)
  const camelName = toCamelCase(name)
  const kebabName = toKebabCase(name)

  return `/**
 * ${pascalName} 服务层
 *
 * 职责：
 * - 业务逻辑处理
 * - 数据验证
 * - 调用数据访问层
 */

// TODO: 导入数据库操作
// import { db } from '@server/db'
// import { ${kebabName}s } from '@server/db/schema'

export const ${camelName}Service = {
  /**
   * 获取所有${pascalName}
   */
  async getAll() {
    // TODO: 实现数据库查询
    return []
  },

  /**
   * 根据ID获取${pascalName}
   */
  async getById(id: string) {
    // TODO: 实现数据库查询
    return null
  },

  /**
   * 创建${pascalName}
   */
  async create(data: unknown) {
    // TODO: 实现数据库插入
    return data
  },

  /**
   * 更新${pascalName}
   */
  async update(id: string, data: unknown) {
    // TODO: 实现数据库更新
    return null
  },

  /**
   * 删除${pascalName}
   */
  async delete(id: string) {
    // TODO: 实现数据库删除
    return false
  },
}
`
}

function generateModuleRouteTemplate(name: string): string {
  const pascalName = toPascalCase(name)
  const camelName = toCamelCase(name)
  const kebabName = toKebabCase(name)

  return `import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { ${camelName}Service } from '../services/${kebabName}-service'

export const ${camelName}Routes = new Hono()

${camelName}Routes.get(
  '/${kebabName}s',
  describeRoute({
    description: '获取${pascalName}列表',
    responses: {
      200: {
        description: '成功返回${pascalName}列表',
      },
    },
  }),
  async c => {
    const result = await ${camelName}Service.getAll()
    return c.json({
      success: true,
      data: result,
    })
  }
)
`
}

function generateModuleServiceTemplate(name: string): string {
  const pascalName = toPascalCase(name)
  const camelName = toCamelCase(name)

  return `/**
 * ${pascalName} 服务层
 */

export const ${camelName}Service = {
  async getAll() {
    return []
  },

  async getById(id: string) {
    return null
  },

  async create(data: unknown) {
    return data
  },

  async update(id: string, data: unknown) {
    return null
  },

  async delete(id: string) {
    return false
  },
}
`
}

function generateServiceTestTemplate(name: string): string {
  const pascalName = toPascalCase(name)
  const camelName = toCamelCase(name)

  return `import { describe, it, expect } from 'vitest'
import { ${camelName}Service } from '../services/${name}-service'

describe('${pascalName} Service', () => {
  describe('getAll', () => {
    it('should return an array', async () => {
      const result = await ${camelName}Service.getAll()
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('getById', () => {
    it('should return null for non-existent id', async () => {
      const result = await ${camelName}Service.getById('non-existent')
      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    it('should create a new ${camelName}', async () => {
      const data = { name: 'Test ${pascalName}' }
      const result = await ${camelName}Service.create(data)
      expect(result).toBeDefined()
    })
  })

  describe('update', () => {
    it('should return null for non-existent id', async () => {
      const result = await ${camelName}Service.update('non-existent', {})
      expect(result).toBeNull()
    })
  })

  describe('delete', () => {
    it('should return false for non-existent id', async () => {
      const result = await ${camelName}Service.delete('non-existent')
      expect(result).toBe(false)
    })
  })
})
`
}

function generateRouteTestTemplate(name: string): string {
  const pascalName = toPascalCase(name)
  const kebabName = toKebabCase(name)

  return `import { describe, it, expect } from 'vitest'
import { testClient } from '@server/test-utils/test-client'
import { ${kebabName}Routes } from '../routes/${kebabName}-routes'

describe('${pascalName} Routes', () => {
  const client = testClient(${kebabName}Routes)

  describe('GET /${kebabName}s', () => {
    it('should return list of ${kebabName}s', async () => {
      const res = await client['/${kebabName}s'].$get()
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      expect(Array.isArray(data.data)).toBe(true)
    })
  })

  describe('GET /${kebabName}s/:id', () => {
    it('should return 404 for non-existent ${kebabName}', async () => {
      const res = await client['/${kebabName}s'][':id'].$get({
        param: { id: 'non-existent' },
      })
      expect(res.status).toBe(404)
    })
  })
})
`
}

function createRoute(name: string): string[] {
  const kebabName = toKebabCase(name)
  const routesDir = path.join(templateDir, 'src/server/routes')
  const filePath = path.join(routesDir, `${kebabName}-routes.ts`)

  if (fs.existsSync(filePath)) {
    console.log(`⚠️  文件已存在: ${filePath}`)
    return []
  }

  fs.mkdirSync(routesDir, { recursive: true })
  fs.writeFileSync(filePath, generateRouteTemplate(name))

  return [filePath]
}

function createService(name: string): string[] {
  const kebabName = toKebabCase(name)
  const servicesDir = path.join(templateDir, 'src/server/services')
  const filePath = path.join(servicesDir, `${kebabName}-service.ts`)

  if (fs.existsSync(filePath)) {
    console.log(`⚠️  文件已存在: ${filePath}`)
    return []
  }

  fs.mkdirSync(servicesDir, { recursive: true })
  fs.writeFileSync(filePath, generateServiceTemplate(name))

  return [filePath]
}

function createModule(name: string): string[] {
  const kebabName = toKebabCase(name)
  const moduleName = `module-${kebabName}`
  const moduleDir = path.join(templateDir, 'src/server', moduleName)

  if (fs.existsSync(moduleDir)) {
    console.log(`⚠️  模块已存在: ${moduleDir}`)
    return []
  }

  const createdFiles: string[] = []

  // 创建目录结构
  const routesDir = path.join(moduleDir, 'routes')
  const servicesDir = path.join(moduleDir, 'services')
  const testsDir = path.join(moduleDir, '__tests__')

  fs.mkdirSync(routesDir, { recursive: true })
  fs.mkdirSync(servicesDir, { recursive: true })
  fs.mkdirSync(testsDir, { recursive: true })

  // 创建路由文件
  const routeFile = path.join(routesDir, `${kebabName}-routes.ts`)
  fs.writeFileSync(routeFile, generateModuleRouteTemplate(name))
  createdFiles.push(routeFile)

  // 创建服务文件
  const serviceFile = path.join(servicesDir, `${kebabName}-service.ts`)
  fs.writeFileSync(serviceFile, generateModuleServiceTemplate(name))
  createdFiles.push(serviceFile)

  // 创建测试文件
  const serviceTestFile = path.join(testsDir, `${kebabName}-service.test.ts`)
  fs.writeFileSync(serviceTestFile, generateServiceTestTemplate(name))
  createdFiles.push(serviceTestFile)

  const routeTestFile = path.join(testsDir, `${kebabName}-route.test.ts`)
  fs.writeFileSync(routeTestFile, generateRouteTestTemplate(name))
  createdFiles.push(routeTestFile)

  return createdFiles
}

function main(): void {
  const args = process.argv.slice(2)

  if (args.length < 2) {
    console.log(`
用法：
  npm run create:route <name>      创建路由文件
  npm run create:service <name>    创建服务文件
  npm run create:module <name>     创建完整模块

示例：
  npm run create:route user
  npm run create:service user
  npm run create:module product
`)
    process.exit(1)
  }

  const [type, name] = args as [CreateOptions['type'], string]

  if (!['route', 'service', 'module'].includes(type)) {
    console.log(`❌ 无效的类型: ${type}`)
    console.log('   支持的类型: route, service, module')
    process.exit(1)
  }

  let createdFiles: string[] = []

  switch (type) {
    case 'route':
      createdFiles = createRoute(name)
      break
    case 'service':
      createdFiles = createService(name)
      break
    case 'module':
      createdFiles = createModule(name)
      break
  }

  if (createdFiles.length > 0) {
    console.log(`\n✅ 创建成功！\n`)
    console.log('创建的文件：')
    createdFiles.forEach(file => {
      const relativePath = path.relative(templateDir, file)
      console.log(`  - ${relativePath}`)
    })
    console.log()
  }
}

main()

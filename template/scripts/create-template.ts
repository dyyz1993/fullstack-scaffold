/**
 * 模块模板生成器
 *
 * 用法：
 *   npm run create:module <name>     创建完整模块（路由+服务+测试+schema）
 *
 * 示例：
 *   npm run create:module product    -> src/server/module-product/
 *
 * 自动操作：
 *   1. 创建模块目录结构
 *   2. 创建 schema 文件 (shared/modules/{name}/schemas.ts)
 *   3. 更新 app.ts 导入和注册路由
 *   4. 更新 shared/modules/index.ts 导出
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const templateDir = path.resolve(__dirname, '..')

interface CreatedFile {
  path: string
  type: 'created' | 'modified'
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

function generateSchemaTemplate(name: string): string {
  const pascalName = toPascalCase(name)
  const camelName = toCamelCase(name)

  return `import { z } from 'zod'

export const ${pascalName}Schema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

export const Create${pascalName}Schema = ${pascalName}Schema.omit({ id: true, createdAt: true, updatedAt: true })

export const Update${pascalName}Schema = ${pascalName}Schema.partial().omit({ id: true, createdAt: true, updatedAt: true })

export const ${pascalName}ListSchema = z.array(${pascalName}Schema)

export type ${pascalName} = z.infer<typeof ${pascalName}Schema>
export type Create${pascalName}Input = z.infer<typeof Create${pascalName}Schema>
export type Update${pascalName}Input = z.infer<typeof Update${pascalName}Schema>
`
}

function generateModuleRouteTemplate(name: string): string {
  const pascalName = toPascalCase(name)
  const camelName = toCamelCase(name)
  const kebabName = toKebabCase(name)

  return `import { createRoute } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import * as ${camelName}Service from '../services/${kebabName}-service'
import { successResponse, errorResponse } from '../../utils/route-helpers'
import {
  ${pascalName}Schema,
  Create${pascalName}Schema,
  Update${pascalName}Schema,
  ${pascalName}ListSchema,
} from '@shared/modules/${kebabName}'

const listRoute = createRoute({
  method: 'get',
  path: '/${kebabName}s',
  tags: ['${kebabName}s'],
  responses: {
    200: successResponse(${pascalName}ListSchema, 'List all ${kebabName}s'),
    500: errorResponse('Internal server error'),
  },
})

const getRoute = createRoute({
  method: 'get',
  path: '/${kebabName}s/{id}',
  tags: ['${kebabName}s'],
  request: {
    params: ${pascalName}Schema.pick({ id: true }),
  },
  responses: {
    200: successResponse(${pascalName}Schema, 'Get ${kebabName} by id'),
    404: errorResponse('${pascalName} not found'),
    500: errorResponse('Internal server error'),
  },
})

const createRoute = createRoute({
  method: 'post',
  path: '/${kebabName}s',
  tags: ['${kebabName}s'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: Create${pascalName}Schema,
        },
      },
    },
  },
  responses: {
    201: successResponse(${pascalName}Schema, 'Create ${kebabName}'),
    400: errorResponse('Invalid input'),
    500: errorResponse('Internal server error'),
  },
})

const updateRoute = createRoute({
  method: 'put',
  path: '/${kebabName}s/{id}',
  tags: ['${kebabName}s'],
  request: {
    params: ${pascalName}Schema.pick({ id: true }),
    body: {
      content: {
        'application/json': {
          schema: Update${pascalName}Schema,
        },
      },
    },
  },
  responses: {
    200: successResponse(${pascalName}Schema, 'Update ${kebabName}'),
    404: errorResponse('${pascalName} not found'),
    400: errorResponse('Invalid input'),
    500: errorResponse('Internal server error'),
  },
})

const deleteRoute = createRoute({
  method: 'delete',
  path: '/${kebabName}s/{id}',
  tags: ['${kebabName}s'],
  request: {
    params: ${pascalName}Schema.pick({ id: true }),
  },
  responses: {
    200: successResponse(z.object({ message: z.string() }), '${pascalName} deleted'),
    404: errorResponse('${pascalName} not found'),
    500: errorResponse('Internal server error'),
  },
})

import { z } from 'zod'

export const ${camelName}Routes = new OpenAPIHono()
  .openapi(listRoute, async c => {
    const result = await ${camelName}Service.getAll()
    return c.json({ success: true, data: result })
  })
  .openapi(getRoute, async c => {
    const { id } = c.req.valid('param')
    const result = await ${camelName}Service.getById(id)
    if (!result) {
      return c.json({ success: false, error: '${pascalName} not found' }, 404)
    }
    return c.json({ success: true, data: result })
  })
  .openapi(createRoute, async c => {
    const body = c.req.valid('json')
    const result = await ${camelName}Service.create(body)
    return c.json({ success: true, data: result }, 201)
  })
  .openapi(updateRoute, async c => {
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const result = await ${camelName}Service.update(id, body)
    if (!result) {
      return c.json({ success: false, error: '${pascalName} not found' }, 404)
    }
    return c.json({ success: true, data: result })
  })
  .openapi(deleteRoute, async c => {
    const { id } = c.req.valid('param')
    const result = await ${camelName}Service.delete(id)
    if (!result) {
      return c.json({ success: false, error: '${pascalName} not found' }, 404)
    }
    return c.json({ success: true, data: { message: 'Deleted successfully' } })
  })
`
}

function generateModuleServiceTemplate(name: string): string {
  const pascalName = toPascalCase(name)
  const camelName = toCamelCase(name)

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
// import { ${camelName}s } from '@server/db/schema'

export const getAll = async () => {
  // TODO: 实现数据库查询
  return []
}

export const getById = async (id: string) => {
  // TODO: 实现数据库查询
  return null
}

export const create = async (data: unknown) => {
  // TODO: 实现数据库插入
  return data
}

export const update = async (id: string, data: unknown) => {
  // TODO: 实现数据库更新
  return null
}

export const delete${pascalName} = async (id: string) => {
  // TODO: 实现数据库删除
  return false
}
`
}

function generateServiceTestTemplate(name: string): string {
  const pascalName = toPascalCase(name)
  const kebabName = toKebabCase(name)

  return `import { describe, it, expect } from 'vitest'
import * as service from '../services/${kebabName}-service'

describe('${pascalName} Service', () => {
  describe('getAll', () => {
    it('should return an array', async () => {
      const result = await service.getAll()
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('getById', () => {
    it('should return null for non-existent id', async () => {
      const result = await service.getById('non-existent')
      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    it('should create a new item', async () => {
      const data = { name: 'Test Item' }
      const result = await service.create(data)
      expect(result).toBeDefined()
    })
  })

  describe('update', () => {
    it('should return null for non-existent id', async () => {
      const result = await service.update('non-existent', {})
      expect(result).toBeNull()
    })
  })

  describe('delete', () => {
    it('should return false for non-existent id', async () => {
      const result = await service.delete${pascalName}('non-existent')
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
import { createTestClient } from '../../test-utils/test-client'

describe('${pascalName} Routes', () => {
  describe('GET /api/${kebabName}s', () => {
    it('should return list of ${kebabName}s', async () => {
      const client = createTestClient()
      const res = await client.api.${kebabName}s.$get()
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      expect(Array.isArray(data.data)).toBe(true)
    })
  })

  describe('GET /api/${kebabName}s/:id', () => {
    it('should return 404 for non-existent ${kebabName}', async () => {
      const client = createTestClient()
      const res = await client.api.${kebabName}s[':id'].$get({
        param: { id: 'non-existent' },
      })
      expect(res.status).toBe(404)
    })
  })
})
`
}

function generateModuleIndexTemplate(name: string): string {
  return `export * from './schemas'
`
}

function updateAppTs(name: string): boolean {
  const appPath = path.join(templateDir, 'src/server/app.ts')
  if (!fs.existsSync(appPath)) {
    console.log(`⚠️  app.ts 不存在: ${appPath}`)
    return false
  }

  const pascalName = toPascalCase(name)
  const camelName = toCamelCase(name)
  const kebabName = toKebabCase(name)

  let content = fs.readFileSync(appPath, 'utf-8')

  // 检查是否已经导入
  if (content.includes(`${camelName}Routes`)) {
    console.log(`⚠️  app.ts 已经包含 ${camelName}Routes`)
    return false
  }

  // 添加导入语句
  const importRegex = /(import \{[^}]+\} from '\.\/module-[^']+'\n)/
  const lastImportMatch = content.match(importRegex)

  if (lastImportMatch) {
    const lastImportIndex = content.lastIndexOf(lastImportMatch[0]) + lastImportMatch[0].length
    content =
      content.slice(0, lastImportIndex) +
      `import { ${camelName}Routes } from './module-${kebabName}/routes/${kebabName}-routes'\n` +
      content.slice(lastImportIndex)
  } else {
    // 如果找不到现有的模块导入，在第一个 import 后添加
    const firstImportEnd = content.indexOf('\n', content.indexOf('import'))
    content =
      content.slice(0, firstImportEnd + 1) +
      `import { ${camelName}Routes } from './module-${kebabName}/routes/${kebabName}-routes'\n` +
      content.slice(firstImportEnd + 1)
  }

  // 添加路由注册
  const routeRegex = /(\.route\('\/api', [a-zA-Z]+Routes\)\n)/
  const lastRouteMatch = content.match(routeRegex)

  if (lastRouteMatch) {
    const lastRouteIndex = content.lastIndexOf(lastRouteMatch[0]) + lastRouteMatch[0].length
    content =
      content.slice(0, lastRouteIndex) +
      `    .route('/api', ${camelName}Routes)\n` +
      content.slice(lastRouteIndex)
  }

  // 添加导出
  const exportRegex = /export \{[^}]+\}/
  const exportMatch = content.match(exportRegex)

  if (exportMatch) {
    const exportStatement = exportMatch[0]
    const newExport = exportStatement.replace('}', `, ${camelName}Routes }`)
    content = content.replace(exportRegex, newExport)
  }

  fs.writeFileSync(appPath, content)
  return true
}

function updateSharedModulesIndex(name: string): boolean {
  const indexPath = path.join(templateDir, 'src/shared/modules/index.ts')
  if (!fs.existsSync(indexPath)) {
    console.log(`⚠️  shared/modules/index.ts 不存在: ${indexPath}`)
    return false
  }

  const pascalName = toPascalCase(name)
  const kebabName = toKebabCase(name)

  let content = fs.readFileSync(indexPath, 'utf-8')

  // 检查是否已经导出
  if (content.includes(`from './${kebabName}'`)) {
    console.log(`⚠️  shared/modules/index.ts 已经包含 ${kebabName} 模块`)
    return false
  }

  // 添加导出
  const exportStatement = `
export {
  ${pascalName}Schema,
  Create${pascalName}Schema,
  Update${pascalName}Schema,
  ${pascalName}ListSchema,
  type ${pascalName},
  type Create${pascalName}Input,
  type Update${pascalName}Input,
} from './${kebabName}'`

  content = content.trimEnd() + exportStatement + '\n'

  fs.writeFileSync(indexPath, content)
  return true
}

function createModule(name: string): CreatedFile[] {
  const kebabName = toKebabCase(name)
  const pascalName = toPascalCase(name)
  const moduleName = `module-${kebabName}`
  const moduleDir = path.join(templateDir, 'src/server', moduleName)
  const sharedModuleDir = path.join(templateDir, 'src/shared/modules', kebabName)

  const createdFiles: CreatedFile[] = []

  // 检查模块是否已存在
  if (fs.existsSync(moduleDir)) {
    console.log(`⚠️  模块已存在: ${moduleDir}`)
    return []
  }

  // 创建服务端模块目录结构
  const routesDir = path.join(moduleDir, 'routes')
  const servicesDir = path.join(moduleDir, 'services')
  const testsDir = path.join(moduleDir, '__tests__')

  fs.mkdirSync(routesDir, { recursive: true })
  fs.mkdirSync(servicesDir, { recursive: true })
  fs.mkdirSync(testsDir, { recursive: true })

  // 创建共享模块目录
  fs.mkdirSync(sharedModuleDir, { recursive: true })

  // 创建 schema 文件
  const schemaFile = path.join(sharedModuleDir, 'schemas.ts')
  fs.writeFileSync(schemaFile, generateSchemaTemplate(name))
  createdFiles.push({ path: schemaFile, type: 'created' })

  // 创建共享模块 index
  const sharedIndexFile = path.join(sharedModuleDir, 'index.ts')
  fs.writeFileSync(sharedIndexFile, generateModuleIndexTemplate(name))
  createdFiles.push({ path: sharedIndexFile, type: 'created' })

  // 创建路由文件
  const routeFile = path.join(routesDir, `${kebabName}-routes.ts`)
  fs.writeFileSync(routeFile, generateModuleRouteTemplate(name))
  createdFiles.push({ path: routeFile, type: 'created' })

  // 创建服务文件
  const serviceFile = path.join(servicesDir, `${kebabName}-service.ts`)
  fs.writeFileSync(serviceFile, generateModuleServiceTemplate(name))
  createdFiles.push({ path: serviceFile, type: 'created' })

  // 创建测试文件
  const serviceTestFile = path.join(testsDir, `${kebabName}-service.test.ts`)
  fs.writeFileSync(serviceTestFile, generateServiceTestTemplate(name))
  createdFiles.push({ path: serviceTestFile, type: 'created' })

  const routeTestFile = path.join(testsDir, `${kebabName}-route.test.ts`)
  fs.writeFileSync(routeTestFile, generateRouteTestTemplate(name))
  createdFiles.push({ path: routeTestFile, type: 'created' })

  // 更新 app.ts
  if (updateAppTs(name)) {
    createdFiles.push({ path: path.join(templateDir, 'src/server/app.ts'), type: 'modified' })
  }

  // 更新 shared/modules/index.ts
  if (updateSharedModulesIndex(name)) {
    createdFiles.push({
      path: path.join(templateDir, 'src/shared/modules/index.ts'),
      type: 'modified',
    })
  }

  return createdFiles
}

function main(): void {
  const args = process.argv.slice(2)

  if (args.length < 2) {
    console.log(`
用法：
  npm run create:module <name>     创建完整模块

示例：
  npm run create:module product

自动操作：
  1. 创建模块目录结构 (src/server/module-{name}/)
  2. 创建 schema 文件 (src/shared/modules/{name}/schemas.ts)
  3. 更新 app.ts 导入和注册路由
  4. 更新 shared/modules/index.ts 导出
`)
    process.exit(1)
  }

  const [type, name] = args

  if (type !== 'module') {
    console.log(`❌ 无效的类型: ${type}`)
    console.log('   只支持: module')
    process.exit(1)
  }

  const createdFiles = createModule(name)

  if (createdFiles.length > 0) {
    const created = createdFiles.filter(f => f.type === 'created')
    const modified = createdFiles.filter(f => f.type === 'modified')

    console.log(`\n✅ 模块创建成功！\n`)

    if (created.length > 0) {
      console.log('📄 创建的文件：')
      created.forEach(file => {
        const relativePath = path.relative(templateDir, file.path)
        console.log(`   ${relativePath}`)
      })
      console.log()
    }

    if (modified.length > 0) {
      console.log('✏️  修改的文件：')
      modified.forEach(file => {
        const relativePath = path.relative(templateDir, file.path)
        console.log(`   ${relativePath}`)
      })
      console.log()
    }

    console.log('🚀 下一步：')
    console.log('   1. 实现服务层业务逻辑 (services/*.ts)')
    console.log('   2. 添加数据库操作')
    console.log('   3. 运行测试: npm test')
    console.log()
  }
}

main()

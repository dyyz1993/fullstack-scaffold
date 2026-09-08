/**
 * @framework-baseline bd40e51c9ebe57ab
 */

import { RuleTester } from 'eslint'
import tseslint from 'typescript-eslint'
import { noMergedApiTypeExport } from '../no-merged-api-type-export.js'

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
})

ruleTester.run('no-merged-api-type-export', noMergedApiTypeExport, {
  valid: [
    {
      // 运行时链式挂载是合法的 —— 约束的是"类型出口"，不是运行时
      filename: 'src/server/route-registry.ts',
      code: `
import { OpenAPIHono } from '@hono/zod-openapi'

export const clientApiRoutes = new OpenAPIHono()
  .route('/api', moduleA)
  .route('/api', moduleB)
  .route('/api', moduleC)
`,
    },
    {
      // 模块级类型导出（深度 = 1 个模块）是推荐做法
      filename: 'src/server/module-todos/routes/todos-routes.ts',
      code: `
import { OpenAPIHono } from '@hono/zod-openapi'

export const apiRoutes = new OpenAPIHono()
  .openapi(listRoute, handler)

export type TodosApiType = typeof apiRoutes
`,
    },
    {
      // typeof 引用的变量没有链式 .route —— 不是 merge 结果
      filename: 'src/server/module-chat/routes/chat-routes.ts',
      code: `
export const chatRoutes = new OpenAPIHono()

export type ChatApiType = typeof chatRoutes
`,
    },
  ],
  invalid: [
    {
      // 出口 1: export type = typeof <链式 merge 实例>
      filename: 'src/server/route-registry.ts',
      code: `
import { OpenAPIHono } from '@hono/zod-openapi'

export const clientApiRoutes = new OpenAPIHono()
  .route('/api', moduleA)
  .route('/api', moduleB)

export type ClientApiRoutes = typeof clientApiRoutes
`,
      errors: [{ messageId: 'noMergedTypeExport', data: { name: 'clientApiRoutes' } }],
    },
    {
      // 出口 2: ReturnType<typeof createApp> —— app 工厂内部链式 merge
      filename: 'src/server/app.ts',
      code: `
import { OpenAPIHono } from '@hono/zod-openapi'

export function createApp() {
  return new OpenAPIHono()
    .route('/', clientApiRoutes)
    .route('/', adminApiRoutes)
}

export type AppType = ReturnType<typeof createApp>
`,
      errors: [{ messageId: 'noReturnTypeOfAppFactory', data: { name: 'createApp' } }],
    },
    {
      // 出口 3: ReturnType<typeof hc<MegaType>>> —— 测试客户端的 mega 实例化
      filename: 'src/server/test-utils/test-client.ts',
      code: `
import { hc } from 'hono/client'
import type { AppType } from '@server/index'

export type TestClient = ReturnType<typeof hc<AppType>>
`,
      errors: [{ messageId: 'noReturnTypeOfHcInstantiation' }],
    },
  ],
})

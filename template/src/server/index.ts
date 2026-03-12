/**
 * Server Entry Point - Framework level, no business code awareness
 *
 * This file initializes the runtime adapter and automatically scans
 * for business modules using convention over configuration.
 */

import { setRuntimeAdapter } from './core/runtime'
import { getNodeRuntimeAdapter } from './core/runtime-node'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createApp } from './app'

const runtimeAdapter = getNodeRuntimeAdapter()
setRuntimeAdapter(runtimeAdapter)

// HTML 文件路径（开发环境直接读取根目录）
const indexHtmlPath = resolve(process.cwd(), 'index.html')
const adminHtmlPath = resolve(process.cwd(), 'admin.html')

const indexHtml = existsSync(indexHtmlPath)
  ? readFileSync(indexHtmlPath, 'utf-8')
  : '<html><body>index.html not found</body></html>'
const adminHtml = existsSync(adminHtmlPath)
  ? readFileSync(adminHtmlPath, 'utf-8')
  : '<html><body>admin.html not found</body></html>'

// 创建 Hono 应用并添加前端路由处理
const app = createApp()
  .get('/admin/*', c => {
    return c.html(adminHtml)
  })
  .get('*', c => {
    return c.html(indexHtml)
  })

export default app

export {
  createApp,
  apiRoutes,
  notificationRoutes,
  chatRoutes,
  adminRoutes,
  type AppType,
} from './app'
export { type AppBindings, type CreateAppOptions } from './types/bindings'
export { getAppConfig, getDatabaseConfig, type AppConfig, type DatabaseConfig } from './config'
export { createServer, startServer } from './entries/node'

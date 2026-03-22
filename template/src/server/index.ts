/**
 * @framework-baseline 13391b28b7c66ede
 * @framework-modify
 * @reason 添加 OpsApiType 导出以支持客户端类型安全的 RPC 调用
 * @impact 导出 OpsApiType 供 ops 模块使用
 */

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
const opsHtmlPath = resolve(process.cwd(), 'ops.html')

const indexHtml = existsSync(indexHtmlPath)
  ? readFileSync(indexHtmlPath, 'utf-8')
  : '<html><body>index.html not found</body></html>'
const opsHtml = existsSync(opsHtmlPath)
  ? readFileSync(opsHtmlPath, 'utf-8')
  : '<html><body>ops.html not found</body></html>'

// 创建 Hono 应用
const app = createApp()

// 添加 Ops 路由
app.get('/ops/*', c => {
  return c.html(opsHtml)
})

// SPA fallback - 使用中间件方式，确保 API 路由已经注册后才添加
app.use('*', async (c, next) => {
  await next()

  // 如果响应已经是 404，且路径不是 API 或文件路径，则返回 index.html
  if (c.res.status === 404) {
    const path = c.req.path
    if (!path.startsWith('/api/') && !path.startsWith('/files/')) {
      c.res = c.html(indexHtml)
    }
  }
})

export default app

export { createApp } from './app'
export { type AppBindings, type CreateAppOptions } from './types/bindings'
export { getAppConfig, getDatabaseConfig, type AppConfig, type DatabaseConfig } from './config'
export { createServer, startServer } from './entries/node'
export type { ClientApiType, OpsApiType, AppType } from './app'

import type { Context } from 'hono'
import type { UpgradeWebSocket } from 'hono/ws'

/**
 * 💡 WebSocket 适配器获取助手
 *
 * 它可以从 Hono Context 或 Environment 中获取升级 WebSocket 的实现。
 * 在不同的运行环境（Node.js, Cloudflare, Bun, Deno）下，Hono 会注入不同的实现。
 *
 * @param c Hono 上下文
 * @returns WebSocket 升级函数 or undefined
 */
export const getWSAdapter = <T = unknown>(c: Context): UpgradeWebSocket<T> | undefined => {
  // 1. 优先从 Context 获取 (某些适配器会注入到这里)
  const fromContext = c.get('upgradeWebSocket')
  if (fromContext) return fromContext as UpgradeWebSocket<T>

  // 2. 尝试从 Env 获取 (Cloudflare Workers 等环境)
  const fromEnv = (c.env as any)?.upgradeWebSocket
  if (fromEnv) return fromEnv as UpgradeWebSocket<T>

  // 3. 开发环境补丁: 如果在 Vite/Node 环境下缺失，可以尝试手动注入
  // 注意：在 Vite dev server 中，通常需要通过 configureServer 钩子来处理 upgrade 事件

  return undefined
}

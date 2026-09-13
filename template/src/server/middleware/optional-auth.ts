import type { MiddlewareHandler } from 'hono'
import { authMiddleware } from './auth'

/**
 * 可选鉴权中间件——"游客可用、登录增强"接口专用（如插件安装：
 * 游客仅累加下载计数，登录用户额外记录 plugin_installs 安装行）。
 *
 * 行为：
 * - 无 Authorization 头（游客）：静默放行，不注入 authUser
 * - 携带有效 token：验证通过并注入 authUser
 * - 携带无效/过期 token：仍按 401 拒绝（与强制鉴权语义一致，
 *   apiClient 统一拦截 401 跳转 /login）
 */
export function optionalAuthMiddleware(): MiddlewareHandler {
  const required = authMiddleware()

  return async (c, next) => {
    if (!c.req.header('Authorization')) {
      await next()
      return
    }
    await required(c, next)
  }
}

import type { ResolvedPreset } from './template-generator'

export function generateMiddlewareIndex(resolved: ResolvedPreset): string {
  const lines: string[] = []

  lines.push(`export { corsMiddleware, createCorsMiddleware, type CorsOptions } from './cors'`)
  lines.push(
    `export { loggerMiddleware, createLoggerMiddleware, type LoggerOptions } from './logger'`
  )
  lines.push(
    `export {\n  errorHandlerMiddleware,\n  createErrorHandlerMiddleware,\n  type ErrorHandlerOptions,\n} from './error-handler'`
  )

  if (resolved.hasPermission) {
    lines.push(
      `export {\n  authMiddleware,\n  requireSuperAdminMiddleware,\n  requireCustomerServiceMiddleware,\n  requirePermissionsMiddleware,\n  type AuthUser,\n  type AuthMiddlewareOptions,\n} from './auth'`
    )
  }

  if (resolved.hasCaptcha) {
    lines.push(
      `export {\n  captchaMiddleware,\n  markCaptchaVerifiedMiddleware,\n  clearCaptchaSessionMiddleware,\n  type CaptchaConfig,\n} from './captcha'`
    )
  }

  if (resolved.hasPermission) {
    lines.push(`export { permissionMiddleware } from './permission'`)
  }

  lines.push(`export { rateLimitMiddleware, type RateLimitOptions } from './rate-limit'`)

  if (resolved.hasPermission) {
    lines.push(`export { getAuthUser } from '../utils/auth'`)
  }

  return lines.join('\n') + '\n'
}

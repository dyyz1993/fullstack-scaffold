/**
 * @framework-baseline 151526f6bc6938de
 * @framework-modify
 * @reason 输入超长白屏修复（P1/P2）：新增 parseApiError 容错解析，把 ZodError 对象、
 *         issue 数组、errorHandler details 等多种 400 响应形状归一化为可安全渲染的字符串
 * @impact 所有 client store 的错误态写入（todoStore/pluginStore/authStore 等），
 *         错误提示展示不再因对象渲染抛异常导致整页白屏
 */

/**
 * 容错解析后端 API 错误响应。
 *
 * 根因背景：服务端路由由 @hono/zod-openapi 的 createRoute + zValidator 校验，
 * 未配置 defaultHook 时校验失败的 400 响应体是
 *   { success: false, error: ZodError }  // error 序列化后为 { name: 'ZodError', issues: [...] }
 * 而 errorHandlerMiddleware 捕获的 ZodError 则返回
 *   { success: false, error: 'Validation failed', details: [{ field, message, code }] }
 * 两种结构里 error 都可能不是字符串。历史上 store 把它直接塞进 error state
 * 并以 {error} 渲染，React 抛 "Objects are not valid as a React child" 且无
 * ErrorBoundary 兜底，导致整页白屏。这里统一归一化为可渲染的字符串。
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 把单条 issue（Zod issue 或 errorHandler 的 details 项）格式化为一条文案 */
function formatIssue(issue: unknown): string | null {
  if (typeof issue === 'string') {
    return issue.trim() || null
  }
  if (!isRecord(issue)) {
    return null
  }
  const message = typeof issue.message === 'string' ? issue.message.trim() : ''
  if (!message) {
    return null
  }
  // Zod issue 用 path 数组，errorHandler details 用 field 字符串
  const fieldRaw = Array.isArray(issue.path) ? issue.path[0] : issue.field
  const field = typeof fieldRaw === 'string' || typeof fieldRaw === 'number' ? String(fieldRaw) : ''
  return field ? `${field}: ${message}` : message
}

function formatIssues(issues: unknown[]): string {
  const parts = issues.map(formatIssue).filter((part): part is string => part !== null)
  return parts.join('; ')
}

/** 从任意形状的错误载荷中提取可读文案；取不到时返回 null 由调用方兜底 */
function extractFromErrorValue(error: unknown): string | null {
  // 纯字符串：最常见路径（successResponse 约定 error: string）
  if (typeof error === 'string') {
    return error.trim() || null
  }

  // 数组：直接当作 issue 列表处理
  if (Array.isArray(error)) {
    const formatted = formatIssues(error)
    return formatted || null
  }

  if (isRecord(error)) {
    // ZodError 形状：{ name: 'ZodError', issues: [...] }
    if (Array.isArray(error.issues)) {
      const formatted = formatIssues(error.issues)
      if (formatted) {
        return formatted
      }
    }
    // 普通错误对象：{ message: '...' }
    if (typeof error.message === 'string' && error.message.trim()) {
      return error.message.trim()
    }
  }

  return null
}

/**
 * 解析 API 响应体中的错误文案。
 *
 * 覆盖形状：
 * - { error: string }
 * - { error: ZodError }（@hono/zod-openapi 默认 400 格式，error.issues[].message/path）
 * - { error: [...] }（数组 issue）
 * - { error: { message } }
 * - { error: string, details: [{ field, message }] }（errorHandlerMiddleware 格式）
 * 全部失败时返回 fallback，保证永远返回可被 React 安全渲染的字符串。
 */
export function parseApiError(result: unknown, fallback: string): string {
  if (!isRecord(result)) {
    return fallback
  }

  const fromError = extractFromErrorValue(result.error)
  if (fromError) {
    // errorHandler 400：error 是概要字符串，details 里才是逐字段原因
    if (Array.isArray(result.details)) {
      const detailsText = formatIssues(result.details)
      if (detailsText) {
        return `${fromError}: ${detailsText}`
      }
    }
    return fromError
  }

  // 兜底：无 error 字段但顶层带 message
  if (typeof result.message === 'string' && result.message.trim()) {
    return result.message.trim()
  }

  return fallback
}

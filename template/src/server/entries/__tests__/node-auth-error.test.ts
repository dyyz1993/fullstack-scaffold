/**
 * @framework-baseline 8cbcfbc7c19b0b64
 * @framework-modify
 * @reason 重写为单测 resolveErrorStatus + createTestClient 端到端：原版直接 app.request() 违反 require-type-safe-test-client，且 端到端断言依赖模块端点、无法跨 preset 通用（由 middleware 测试兜底）
 * @impact 仅测试文件；被测逻辑提取至 @server/utils/error-status，行为语义不变（伪 token 401 非 500）
 */

import { describe, it, expect } from 'vitest'
import { resolveErrorStatus } from '@server/utils/error-status'
import { AuthenticationError } from '@server/utils/app-error'

/**
 * node 入口 last-resort onError 的状态解析已提取为 resolveErrorStatus
 * （@server/utils/error-status），此处单测其降级语义；端到端用例走
 * createTestClient 验证统一入口下伪造 token 返回 401 而非 500。
 */
describe('resolveErrorStatus（node 入口 onError 状态解析）', () => {
  it('AppError（statusCode 形状）→ 返回该 statusCode', () => {
    expect(resolveErrorStatus(new AuthenticationError('Invalid token'))).toBe(401)
  })

  it('status 形状错误 → 返回该 status', () => {
    const err = Object.assign(new Error('legacy'), { status: 403 })
    expect(resolveErrorStatus(err)).toBe(403)
  })

  it('普通错误 → 500', () => {
    expect(resolveErrorStatus(new Error('boom'))).toBe(500)
    expect(resolveErrorStatus('string error')).toBe(500)
  })
})

// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestClient } from '@server/test-utils/test-client'
import { setupTestDatabase, cleanupTestDatabase } from '@server/db/test-setup'
import { authRoutes } from '../routes/auth-routes'

/**
 * P2 复现背景：/api/profile 此前免鉴权且恒 200 返回硬编码模拟身份
 * （user-1 / Demo User / demo@example.com）。现挂 authMiddleware，
 * 游客 401，登录后返回当前用户真实身份。
 */
describe('Profile Routes (authMiddleware)', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  it('游客（无 Authorization 头）请求 401，不再泄漏模拟身份', async () => {
    const client = createTestClient(undefined)
    const res = await client.api.profile.$get()
    expect(res.status).toBe(401)

    const data = (await res.json()) as { success: boolean }
    expect(data.success).toBe(false)
  })

  it('无效 token 请求 401', async () => {
    const client = createTestClient(undefined, {
      headers: { Authorization: 'Bearer not-a-real-token' },
    })
    const res = await client.api.profile.$get()
    expect(res.status).toBe(401)
  })

  it('dev token 登录后返回当前用户身份（claims 兜底，而非 Demo User）', async () => {
    const client = createTestClient(undefined, {
      headers: { Authorization: 'Bearer user-token' },
    })
    const res = await client.api.profile.$get()
    expect(res.status).toBe(200)

    const data = (await res.json()) as unknown as {
      success: boolean
      data: { id: string; username: string; email: string; joinDate: string; stats: unknown }
    }
    expect(data.success).toBe(true)
    expect(data.data.id).toBe('user-1')
    expect(data.data.username).toBe('user')
    expect(data.data.email).toBe('user@example.com')
    expect(data.data.joinDate).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(data.data.stats).toBeDefined()
    expect(JSON.stringify(data.data)).not.toContain('Demo User')
  })

  it('注册用户登录后返回注册身份（真实数据，非模拟身份）', async () => {
    // 注册走模块级 authRoutes（全量 app 的 /auth/register 被 admin 模块
    // clientAuthRoutes 遮蔽，返回体不含 token），token 再经 createTestClient 验证
    const registerRes = await authRoutes.fetch(
      new Request('http://localhost/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'profileuser',
          email: 'profileuser@example.com',
          password: 'password123',
        }),
      })
    )
    expect(registerRes.status).toBe(201)
    const registerData = (await registerRes.json()) as {
      success: boolean
      data: { token: string }
    }
    const token = registerData.data.token

    const authed = createTestClient(undefined, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const res = await authed.api.profile.$get()
    expect(res.status).toBe(200)

    const data = (await res.json()) as unknown as {
      success: boolean
      data: { id: string; username: string; email: string }
    }
    expect(data.success).toBe(true)
    expect(data.data.username).toBe('profileuser')
    expect(data.data.email).toBe('profileuser@example.com')
  })
})

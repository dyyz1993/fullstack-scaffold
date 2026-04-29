import bcrypt from 'bcryptjs'
import type { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'
import { sign, verify } from 'hono/jwt'

declare module 'hono' {
  interface ContextVariableMap {
    user: JwtPayload
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'
const SALT_ROUNDS = 10

export interface JwtPayload {
  userId: string
  role: string
  tenantId: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function generateToken(payload: JwtPayload): Promise<string> {
  return sign({ ...payload, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 }, JWT_SECRET)
}

export async function jwtAuthMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.replace('Bearer ', '') || getCookie(c, 'token')

  if (!token) {
    return c.json({ success: false, error: 'Authentication required' }, 401)
  }

  try {
    const payload = await verify(token, JWT_SECRET, 'HS256')
    c.set('user', payload as unknown as JwtPayload)
    await next()
  } catch {
    return c.json({ success: false, error: 'Invalid or expired token' }, 401)
  }
}

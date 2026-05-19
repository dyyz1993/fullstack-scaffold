// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { getRawClient, getDb } from '@server/db'
import { setupTestDatabase, cleanupTestDatabase } from '@server/db/test-setup'
import { hashSync } from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { authRoutes } from '../routes/auth-routes'

const secretKey = process.env.AUTH_SECRET_KEY || 'dev-secret-key-change-in-production'

describe('Auth Routes', () => {
  beforeAll(async () => {
    await setupTestDatabase()
    const db = await getDb()
    expect(db).toBeDefined()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    const client = await getRawClient()
    if (client && 'execute' in client) {
      await client.execute('DELETE FROM developers')
    }
  })

  afterEach(async () => {
    const client = await getRawClient()
    if (client && 'execute' in client) {
      await client.execute('DELETE FROM developers')
    }
  })

  async function insertTestDeveloper(overrides: Record<string, unknown> = {}) {
    const client = await getRawClient()
    if (!client || !('execute' in client)) throw new Error('No DB client')

    const id = (overrides.id as string) || 'dev-test-id'
    const username = (overrides.username as string) || 'testuser'
    const email = (overrides.email as string) || 'test@example.com'
    const passwordHash = (overrides.passwordHash as string) || hashSync('password123', 10)
    const apiKey = (overrides.apiKey as string) || 'ak_test-api-key'
    const now = Date.now()

    await client.execute({
      sql: `INSERT INTO developers (id, username, email, password_hash, role, api_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, username, email, passwordHash, 'developer', apiKey, now, now],
    })

    return { id, username, email, apiKey, passwordHash }
  }

  async function registerUser(username: string, email: string, password: string) {
    return authRoutes.fetch(
      new Request('http://localhost/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      })
    )
  }

  async function loginUser(payload: Record<string, string>) {
    return authRoutes.fetch(
      new Request('http://localhost/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    )
  }

  describe('POST /auth/register', () => {
    it('should register a new developer and return 201', async () => {
      const res = await registerUser('newdev', 'newdev@example.com', 'password123')

      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.token).toBeDefined()
      expect(typeof data.data.token).toBe('string')
      expect(data.data.profile.username).toBe('newdev')
      expect(data.data.profile.email).toBe('newdev@example.com')
      expect(data.data.profile.role).toBe('developer')
      expect(data.data.profile.id).toBeDefined()
    })

    it('should return a valid JWT token', async () => {
      const res = await registerUser('jwtuser', 'jwt@example.com', 'password123')
      const data = await res.json()
      expect(data.success).toBe(true)

      const decoded = jwt.verify(data.data.token, secretKey) as jwt.JwtPayload
      expect(decoded.username).toBe('jwtuser')
      expect(decoded.email).toBe('jwt@example.com')
      expect(decoded.role).toBe('developer')
      expect(decoded.userId).toBeDefined()
      expect(decoded.exp).toBeGreaterThan(Date.now() / 1000)
    })

    it('should set token expiry to 7 days', async () => {
      const res = await registerUser('expiryuser', 'expiry@example.com', 'password123')
      const data = await res.json()

      const decoded = jwt.verify(data.data.token, secretKey) as jwt.JwtPayload
      const expectedExp = decoded.iat! + 7 * 24 * 60 * 60
      expect(decoded.exp).toBe(expectedExp)
    })

    it('should return error on duplicate email', async () => {
      await insertTestDeveloper({ email: 'dup@example.com' })
      const res = await registerUser('another', 'dup@example.com', 'password123')
      expect(res.status).toBeGreaterThanOrEqual(400)
    })

    it('should return error on duplicate username', async () => {
      await insertTestDeveloper({ username: 'dupuser' })
      const res = await registerUser('dupuser', 'unique@example.com', 'password123')
      expect(res.status).toBeGreaterThanOrEqual(400)
    })

    it('should return 400 with missing username', async () => {
      const res = await authRoutes.fetch(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'noUser@example.com', password: 'password123' }),
        })
      )
      expect(res.status).toBe(400)
    })

    it('should return 400 with missing email', async () => {
      const res = await authRoutes.fetch(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: 'noemail', password: 'password123' }),
        })
      )
      expect(res.status).toBe(400)
    })

    it('should return 400 with invalid email format', async () => {
      const res = await registerUser('bademail', 'not-an-email', 'password123')
      expect(res.status).toBe(400)
    })

    it('should return 400 with password shorter than 6 chars', async () => {
      const res = await registerUser('shortpw', 'short@example.com', '12345')
      expect(res.status).toBe(400)
    })

    it('should return 400 with username shorter than 3 chars', async () => {
      const res = await registerUser('ab', 'shortname@example.com', 'password123')
      expect(res.status).toBe(400)
    })

    it('should return 400 with username longer than 50 chars', async () => {
      const res = await registerUser('a'.repeat(51), 'long@example.com', 'password123')
      expect(res.status).toBe(400)
    })

    it('should return profile with createdAt timestamp', async () => {
      const res = await registerUser('tsuser', 'ts@example.com', 'password123')
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.profile.createdAt).toBeDefined()
      expect(data.data.profile.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })
  })

  describe('POST /auth/login', () => {
    it('should login with email and return 200', async () => {
      await insertTestDeveloper({ email: 'login@example.com', username: 'loginuser' })

      const res = await loginUser({ email: 'login@example.com', password: 'password123' })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.token).toBeDefined()
      expect(data.data.profile.email).toBe('login@example.com')
      expect(data.data.profile.username).toBe('loginuser')
    })

    it('should login with account field using username', async () => {
      await insertTestDeveloper({ email: 'acct@example.com', username: 'acctuser' })

      const res = await loginUser({ account: 'acctuser', password: 'password123' })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.profile.username).toBe('acctuser')
    })

    it('should login with account field using email', async () => {
      await insertTestDeveloper({ email: 'acctemail@example.com', username: 'acctemailuser' })

      const res = await loginUser({ account: 'acctemail@example.com', password: 'password123' })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.profile.email).toBe('acctemail@example.com')
    })

    it('should return a valid JWT token', async () => {
      await insertTestDeveloper({
        id: 'jwt-login-id',
        email: 'jwtlogin@example.com',
        username: 'jwtlogin',
      })

      const res = await loginUser({ email: 'jwtlogin@example.com', password: 'password123' })
      const data = await res.json()
      expect(data.success).toBe(true)

      const decoded = jwt.verify(data.data.token, secretKey) as jwt.JwtPayload
      expect(decoded.userId).toBe('jwt-login-id')
      expect(decoded.username).toBe('jwtlogin')
    })

    it('should return error on wrong password', async () => {
      await insertTestDeveloper({ email: 'wrongpw@example.com' })

      const res = await loginUser({ email: 'wrongpw@example.com', password: 'wrongpassword' })

      expect(res.status).toBeGreaterThanOrEqual(400)
    })

    it('should return error with non-existent email', async () => {
      const res = await loginUser({ email: 'nonexistent@example.com', password: 'password123' })

      expect(res.status).toBeGreaterThanOrEqual(400)
    })

    it('should return 400 with missing both account and email', async () => {
      const res = await loginUser({ password: 'password123' })
      expect(res.status).toBe(400)
    })

    it('should return 400 with password shorter than 6 chars', async () => {
      const res = await loginUser({ email: 'any@example.com', password: '12345' })
      expect(res.status).toBe(400)
    })

    it('should not return passwordHash in profile', async () => {
      await insertTestDeveloper({ email: 'safe@example.com', username: 'safeuser' })

      const res = await loginUser({ email: 'safe@example.com', password: 'password123' })
      const data = await res.json()
      expect(data.success).toBe(true)

      const profile = data.data.profile as Record<string, unknown>
      expect(profile).not.toHaveProperty('passwordHash')
      expect(profile).not.toHaveProperty('password_hash')
    })
  })

  describe('Register then Login flow', () => {
    it('should register and then login with same credentials', async () => {
      const registerRes = await registerUser('flowuser', 'flow@example.com', 'password123')
      expect(registerRes.status).toBe(201)

      const loginRes = await loginUser({ email: 'flow@example.com', password: 'password123' })
      expect(loginRes.status).toBe(200)

      const loginData = await loginRes.json()
      expect(loginData.success).toBe(true)
      expect(loginData.data.profile.username).toBe('flowuser')
      expect(loginData.data.profile.email).toBe('flow@example.com')
    })

    it('should register and verify token contains correct claims', async () => {
      const res = await registerUser('verifyflow', 'verifyflow@example.com', 'password123')
      const data = await res.json()
      expect(data.success).toBe(true)

      const decoded = jwt.verify(data.data.token, secretKey) as jwt.JwtPayload
      expect(decoded.username).toBe('verifyflow')
      expect(decoded.email).toBe('verifyflow@example.com')
      expect(decoded.role).toBe('developer')
    })

    it('should register two developers with unique IDs and tokens', async () => {
      const res1 = await registerUser('user1', 'user1@example.com', 'password123')
      const res2 = await registerUser('user2', 'user2@example.com', 'password123')

      const data1 = await res1.json()
      const data2 = await res2.json()
      expect(data1.success).toBe(true)
      expect(data2.success).toBe(true)
      expect(data1.data.profile.id).not.toBe(data2.data.profile.id)
      expect(data1.data.token).not.toBe(data2.data.token)
    })

    it('should register, login, and get matching profile data', async () => {
      const regRes = await registerUser('matchuser', 'match@example.com', 'password123')
      const regData = await regRes.json()
      const regProfile = regData.data.profile

      const loginRes = await loginUser({ email: 'match@example.com', password: 'password123' })
      const loginData = await loginRes.json()
      const loginProfile = loginData.data.profile

      expect(regProfile.id).toBe(loginProfile.id)
      expect(regProfile.username).toBe(loginProfile.username)
      expect(regProfile.email).toBe(loginProfile.email)
    })
  })
})

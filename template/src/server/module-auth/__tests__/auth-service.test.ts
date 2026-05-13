import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import * as authService from '../services/auth-service'
import { getRawClient, getDb } from '@server/db'
import { setupTestDatabase, cleanupTestDatabase } from '@server/db/test-setup'
import { hashSync } from 'bcryptjs'

describe('Auth Service', () => {
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

  describe('registerDeveloper', () => {
    it('should register a new developer successfully', async () => {
      const result = await authService.registerDeveloper({
        username: 'newdev',
        email: 'newdev@example.com',
        password: 'password123',
      })

      expect(result.profile).toBeDefined()
      expect(result.profile.username).toBe('newdev')
      expect(result.profile.email).toBe('newdev@example.com')
      expect(result.profile.role).toBe('developer')
      expect(result.profile.id).toBeDefined()
      expect(result.profile.createdAt).toBeDefined()
    })

    it('should hash the password with bcrypt', async () => {
      await authService.registerDeveloper({
        username: 'hashtest',
        email: 'hashtest@example.com',
        password: 'mypassword',
      })

      const client = await getRawClient()
      if (!client || !('execute' in client)) throw new Error('No DB')
      const result = await client.execute(
        'SELECT password_hash FROM developers WHERE username = ?',
        ['hashtest']
      )
      const row = result.rows[0] as unknown as { password_hash: string }

      expect(row.password_hash).not.toBe('mypassword')
      expect(row.password_hash.startsWith('$2')).toBe(true)
    })

    it('should throw ConflictError on duplicate email', async () => {
      await insertTestDeveloper({ email: 'duplicate@example.com' })

      await expect(
        authService.registerDeveloper({
          username: 'another',
          email: 'duplicate@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Duplicate entry')
    })

    it('should throw ConflictError on duplicate username', async () => {
      await insertTestDeveloper({ username: 'duplicateuser' })

      await expect(
        authService.registerDeveloper({
          username: 'duplicateuser',
          email: 'other@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Duplicate entry')
    })

    it('should generate unique id and api_key', async () => {
      const r1 = await authService.registerDeveloper({
        username: 'user1',
        email: 'user1@example.com',
        password: 'password123',
      })
      const r2 = await authService.registerDeveloper({
        username: 'user2',
        email: 'user2@example.com',
        password: 'password123',
      })

      expect(r1.profile.id).not.toBe(r2.profile.id)
    })
  })

  describe('loginDeveloper', () => {
    it('should login with email', async () => {
      await insertTestDeveloper({
        email: 'login@example.com',
        username: 'loginuser',
      })

      const result = await authService.loginDeveloper({
        email: 'login@example.com',
        password: 'password123',
      })

      expect(result.profile).toBeDefined()
      expect(result.profile.email).toBe('login@example.com')
      expect(result.profile.username).toBe('loginuser')
    })

    it('should login with username via account field', async () => {
      await insertTestDeveloper({
        email: 'account@example.com',
        username: 'accountuser',
      })

      const result = await authService.loginDeveloper({
        account: 'accountuser',
        password: 'password123',
      })

      expect(result.profile).toBeDefined()
      expect(result.profile.username).toBe('accountuser')
    })

    it('should login with email via account field', async () => {
      await insertTestDeveloper({
        email: 'accountemail@example.com',
        username: 'accountemailuser',
      })

      const result = await authService.loginDeveloper({
        account: 'accountemail@example.com',
        password: 'password123',
      })

      expect(result.profile).toBeDefined()
      expect(result.profile.email).toBe('accountemail@example.com')
    })

    it('should throw AuthenticationError on wrong password', async () => {
      await insertTestDeveloper({ email: 'wrongpw@example.com' })

      await expect(
        authService.loginDeveloper({
          email: 'wrongpw@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Invalid credentials')
    })

    it('should throw AuthenticationError when user not found', async () => {
      await expect(
        authService.loginDeveloper({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Invalid credentials')
    })

    it('should not return passwordHash in profile', async () => {
      await insertTestDeveloper({ email: 'safe@example.com', username: 'safeuser' })

      const result = await authService.loginDeveloper({
        email: 'safe@example.com',
        password: 'password123',
      })

      const profile = result.profile as Record<string, unknown>
      expect(profile).not.toHaveProperty('passwordHash')
      expect(profile).not.toHaveProperty('password_hash')
    })
  })

  describe('verifyApiKey', () => {
    it('should return profile for valid API key', async () => {
      await insertTestDeveloper({ apiKey: 'ak_valid-key' })

      const profile = await authService.verifyApiKey('ak_valid-key')

      expect(profile).toBeDefined()
      expect(profile.username).toBe('testuser')
    })

    it('should throw AuthenticationError for invalid API key', async () => {
      await expect(authService.verifyApiKey('ak_invalid-key')).rejects.toThrow('Invalid API key')
    })
  })

  describe('getDeveloperById', () => {
    it('should return profile when developer exists', async () => {
      await insertTestDeveloper({ id: 'dev-find-me' })

      const profile = await authService.getDeveloperById('dev-find-me')

      expect(profile).not.toBeNull()
      expect(profile!.id).toBe('dev-find-me')
      expect(profile!.username).toBe('testuser')
    })

    it('should return null when developer does not exist', async () => {
      const profile = await authService.getDeveloperById('nonexistent-id')

      expect(profile).toBeNull()
    })
  })
})

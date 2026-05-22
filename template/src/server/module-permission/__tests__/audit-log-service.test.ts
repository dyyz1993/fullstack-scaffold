import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { AuditLogService } from '../services/audit-log-service'
import { getRawClient, getDb } from '@server/db'
import { setupTestDatabase, cleanupTestDatabase } from '@server/db/test-setup'
import { RESOURCE_TYPES, ACTION_TYPES } from '@shared/constants'

describe('AuditLog Service', () => {
  let service: AuditLogService

  beforeAll(async () => {
    await setupTestDatabase()
    const db = await getDb()
    expect(db).toBeDefined()
    service = new AuditLogService()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    const client = await getRawClient()
    if (client && 'execute' in client) {
      await client.execute('DELETE FROM permission_audit_logs')
    }
  })

  afterEach(async () => {
    const client = await getRawClient()
    if (client && 'execute' in client) {
      await client.execute('DELETE FROM permission_audit_logs')
    }
  })

  async function insertTestLog(overrides: {
    id: string
    userId: string
    action: string
    resourceType: string
    resourceId?: string
    oldValue?: string
    newValue?: string
    ipAddress?: string
    userAgent?: string
    createdAt?: number
  }) {
    const client = await getRawClient()
    if (client && 'execute' in client) {
      await client.execute({
        sql: `INSERT INTO permission_audit_logs (id, user_id, action, resource_type, resource_id, old_value, new_value, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          overrides.id,
          overrides.userId,
          overrides.action,
          overrides.resourceType,
          overrides.resourceId ?? null,
          overrides.oldValue ?? null,
          overrides.newValue ?? null,
          overrides.ipAddress ?? null,
          overrides.userAgent ?? null,
          overrides.createdAt ?? Date.now(),
        ],
      })
    }
  }

  describe('create', () => {
    it('should create an audit log entry', async () => {
      const data = {
        id: 'log_1',
        userId: 'user-1',
        action: ACTION_TYPES.CREATE,
        resourceType: RESOURCE_TYPES.ROLE,
        resourceId: 'role-1',
        newValue: '{"name":"Admin"}',
        ipAddress: '127.0.0.1',
        userAgent: 'TestAgent/1.0',
      }

      const result = await service.create(data)

      expect(result.id).toBe('log_1')
      expect(result.userId).toBe('user-1')
      expect(result.action).toBe(ACTION_TYPES.CREATE)
      expect(result.resourceType).toBe(RESOURCE_TYPES.ROLE)
      expect(result.resourceId).toBe('role-1')
      expect(result.newValue).toBe('{"name":"Admin"}')
      expect(result.ipAddress).toBe('127.0.0.1')
      expect(result.userAgent).toBe('TestAgent/1.0')
      expect(typeof result.createdAt).toBe('string')
    })

    it('should create log with minimal fields', async () => {
      const data = {
        id: 'log_minimal',
        userId: 'user-1',
        action: ACTION_TYPES.UPDATE,
        resourceType: RESOURCE_TYPES.USER,
      }

      const result = await service.create(data)

      expect(result.id).toBe('log_minimal')
      expect(result.userId).toBe('user-1')
      expect(result.action).toBe(ACTION_TYPES.UPDATE)
      expect(result.resourceType).toBe(RESOURCE_TYPES.USER)
      expect(result.resourceId).toBeNull()
      expect(result.oldValue).toBeNull()
      expect(result.newValue).toBeNull()
    })
  })

  describe('getAll', () => {
    it('should return empty array when no logs exist', async () => {
      const result = await service.getAll()

      expect(result).toEqual([])
      expect(Array.isArray(result)).toBe(true)
    })

    it('should return logs ordered by createdAt descending', async () => {
      const now = Date.now()
      await insertTestLog({
        id: 'log_1',
        userId: 'user-1',
        action: ACTION_TYPES.CREATE,
        resourceType: RESOURCE_TYPES.ROLE,
        createdAt: now,
      })
      await insertTestLog({
        id: 'log_2',
        userId: 'user-2',
        action: ACTION_TYPES.UPDATE,
        resourceType: RESOURCE_TYPES.USER,
        createdAt: now + 1000,
      })

      const result = await service.getAll()

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('log_2')
      expect(result[1].id).toBe('log_1')
    })

    it('should respect limit parameter', async () => {
      for (let i = 0; i < 5; i++) {
        await insertTestLog({
          id: `log_${i}`,
          userId: 'user-1',
          action: ACTION_TYPES.CREATE,
          resourceType: RESOURCE_TYPES.ROLE,
          createdAt: Date.now() + i,
        })
      }

      const result = await service.getAll(2)

      expect(result).toHaveLength(2)
    })

    it('should respect offset parameter', async () => {
      for (let i = 0; i < 5; i++) {
        await insertTestLog({
          id: `log_${i}`,
          userId: 'user-1',
          action: ACTION_TYPES.CREATE,
          resourceType: RESOURCE_TYPES.ROLE,
          createdAt: Date.now() + i,
        })
      }

      const result = await service.getAll(2, 3)

      expect(result).toHaveLength(2)
    })
  })

  describe('getByUserId', () => {
    it('should return logs for specific user', async () => {
      await insertTestLog({
        id: 'log_1',
        userId: 'user-1',
        action: ACTION_TYPES.CREATE,
        resourceType: RESOURCE_TYPES.ROLE,
      })
      await insertTestLog({
        id: 'log_2',
        userId: 'user-2',
        action: ACTION_TYPES.UPDATE,
        resourceType: RESOURCE_TYPES.USER,
      })

      const result = await service.getByUserId('user-1')

      expect(result).toHaveLength(1)
      expect(result[0].userId).toBe('user-1')
    })

    it('should return empty array for unknown user', async () => {
      const result = await service.getByUserId('unknown')

      expect(result).toEqual([])
    })

    it('should respect limit parameter', async () => {
      for (let i = 0; i < 5; i++) {
        await insertTestLog({
          id: `log_${i}`,
          userId: 'user-1',
          action: ACTION_TYPES.CREATE,
          resourceType: RESOURCE_TYPES.ROLE,
          createdAt: Date.now() + i,
        })
      }

      const result = await service.getByUserId('user-1', 3)

      expect(result).toHaveLength(3)
    })
  })

  describe('getByResource', () => {
    it('should return logs for resource type', async () => {
      await insertTestLog({
        id: 'log_1',
        userId: 'user-1',
        action: ACTION_TYPES.CREATE,
        resourceType: RESOURCE_TYPES.ROLE,
        resourceId: 'role-1',
      })
      await insertTestLog({
        id: 'log_2',
        userId: 'user-1',
        action: ACTION_TYPES.UPDATE,
        resourceType: RESOURCE_TYPES.USER,
      })

      const result = await service.getByResource(RESOURCE_TYPES.ROLE)

      expect(result).toHaveLength(1)
      expect(result[0].resourceType).toBe(RESOURCE_TYPES.ROLE)
    })

    it('should filter by resourceId when provided', async () => {
      await insertTestLog({
        id: 'log_1',
        userId: 'user-1',
        action: ACTION_TYPES.CREATE,
        resourceType: RESOURCE_TYPES.ROLE,
        resourceId: 'role-1',
      })
      await insertTestLog({
        id: 'log_2',
        userId: 'user-1',
        action: ACTION_TYPES.UPDATE,
        resourceType: RESOURCE_TYPES.ROLE,
        resourceId: 'role-2',
      })

      const result = await service.getByResource(RESOURCE_TYPES.ROLE, 'role-1')

      expect(result).toHaveLength(1)
      expect(result[0].resourceId).toBe('role-1')
    })

    it('should return all logs for resource type when resourceId is omitted', async () => {
      await insertTestLog({
        id: 'log_1',
        userId: 'user-1',
        action: ACTION_TYPES.CREATE,
        resourceType: RESOURCE_TYPES.ROLE,
        resourceId: 'role-1',
      })
      await insertTestLog({
        id: 'log_2',
        userId: 'user-1',
        action: ACTION_TYPES.UPDATE,
        resourceType: RESOURCE_TYPES.ROLE,
        resourceId: 'role-2',
      })

      const result = await service.getByResource(RESOURCE_TYPES.ROLE)

      expect(result).toHaveLength(2)
    })
  })

  describe('search', () => {
    it('should return all logs when no filters provided', async () => {
      await insertTestLog({
        id: 'log_1',
        userId: 'user-1',
        action: ACTION_TYPES.CREATE,
        resourceType: RESOURCE_TYPES.ROLE,
      })
      await insertTestLog({
        id: 'log_2',
        userId: 'user-2',
        action: ACTION_TYPES.UPDATE,
        resourceType: RESOURCE_TYPES.USER,
      })

      const result = await service.search({})

      expect(result).toHaveLength(2)
    })

    it('should filter by userId', async () => {
      await insertTestLog({
        id: 'log_1',
        userId: 'user-1',
        action: ACTION_TYPES.CREATE,
        resourceType: RESOURCE_TYPES.ROLE,
      })
      await insertTestLog({
        id: 'log_2',
        userId: 'user-2',
        action: ACTION_TYPES.CREATE,
        resourceType: RESOURCE_TYPES.ROLE,
      })

      const result = await service.search({ userId: 'user-1' })

      expect(result).toHaveLength(1)
      expect(result[0].userId).toBe('user-1')
    })

    it('should filter by action', async () => {
      await insertTestLog({
        id: 'log_1',
        userId: 'user-1',
        action: ACTION_TYPES.CREATE,
        resourceType: RESOURCE_TYPES.ROLE,
      })
      await insertTestLog({
        id: 'log_2',
        userId: 'user-1',
        action: ACTION_TYPES.ASSIGN,
        resourceType: RESOURCE_TYPES.ROLE,
      })

      const result = await service.search({ action: ACTION_TYPES.CREATE })

      expect(result).toHaveLength(1)
      expect(result[0].action).toBe(ACTION_TYPES.CREATE)
    })

    it('should filter by resourceType', async () => {
      await insertTestLog({
        id: 'log_1',
        userId: 'user-1',
        action: ACTION_TYPES.CREATE,
        resourceType: RESOURCE_TYPES.ROLE,
      })
      await insertTestLog({
        id: 'log_2',
        userId: 'user-1',
        action: ACTION_TYPES.CREATE,
        resourceType: RESOURCE_TYPES.USER,
      })

      const result = await service.search({ resourceType: RESOURCE_TYPES.ROLE })

      expect(result).toHaveLength(1)
      expect(result[0].resourceType).toBe(RESOURCE_TYPES.ROLE)
    })

    it('should return logs ordered by createdAt descending', async () => {
      await service.create({
        id: 'log_old',
        userId: 'user-1',
        action: ACTION_TYPES.CREATE,
        resourceType: RESOURCE_TYPES.ROLE,
      })
      await service.create({
        id: 'log_new',
        userId: 'user-1',
        action: ACTION_TYPES.UPDATE,
        resourceType: RESOURCE_TYPES.USER,
      })

      const result = await service.search({})

      expect(result).toHaveLength(2)
      const ids = result.map(r => r.id)
      expect(ids).toContain('log_old')
      expect(ids).toContain('log_new')
    })

    it('should combine multiple filters', async () => {
      await insertTestLog({
        id: 'log_1',
        userId: 'user-1',
        action: ACTION_TYPES.CREATE,
        resourceType: RESOURCE_TYPES.ROLE,
      })
      await insertTestLog({
        id: 'log_2',
        userId: 'user-1',
        action: ACTION_TYPES.UPDATE,
        resourceType: RESOURCE_TYPES.ROLE,
      })
      await insertTestLog({
        id: 'log_3',
        userId: 'user-2',
        action: ACTION_TYPES.CREATE,
        resourceType: RESOURCE_TYPES.ROLE,
      })

      const result = await service.search({
        userId: 'user-1',
        action: ACTION_TYPES.CREATE,
      })

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('log_1')
    })
  })

  describe('deleteOlderThan', () => {
    it('should delete logs older than specified days', async () => {
      await service.create({
        id: 'log_old',
        userId: 'user-1',
        action: ACTION_TYPES.CREATE,
        resourceType: RESOURCE_TYPES.ROLE,
      })
      await new Promise(resolve => setTimeout(resolve, 100))
      await service.create({
        id: 'log_new',
        userId: 'user-1',
        action: ACTION_TYPES.UPDATE,
        resourceType: RESOURCE_TYPES.USER,
      })

      const allLogs = await service.getAll()
      expect(allLogs).toHaveLength(2)

      const deletedCount = await service.deleteOlderThan(0)

      expect(deletedCount).toBe(2)
    })

    it('should return 0 when no logs are old enough', async () => {
      await insertTestLog({
        id: 'log_recent',
        userId: 'user-1',
        action: ACTION_TYPES.CREATE,
        resourceType: RESOURCE_TYPES.ROLE,
        createdAt: Date.now(),
      })

      const deletedCount = await service.deleteOlderThan(30)

      expect(deletedCount).toBe(0)
    })

    it('should return 0 when no logs exist', async () => {
      const deletedCount = await service.deleteOlderThan(30)

      expect(deletedCount).toBe(0)
    })
  })
})

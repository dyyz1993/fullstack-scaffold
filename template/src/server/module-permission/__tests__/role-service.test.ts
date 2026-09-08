import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { RoleService } from '../services/role-service'
import { getRawClient, getDb } from '@server/db'
import { setupTestDatabase, cleanupTestDatabase } from '@server/db/test-setup'

describe('Role Service', () => {
  let service: RoleService

  beforeAll(async () => {
    await setupTestDatabase()
    const db = await getDb()
    expect(db).toBeDefined()
    service = new RoleService()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    const client = await getRawClient()
    if (client && 'execute' in client) {
      await client.execute('DELETE FROM user_roles')
      await client.execute('DELETE FROM role_permissions')
      await client.execute('DELETE FROM roles')
    }
  })

  afterEach(async () => {
    const client = await getRawClient()
    if (client && 'execute' in client) {
      await client.execute('DELETE FROM user_roles')
      await client.execute('DELETE FROM role_permissions')
      await client.execute('DELETE FROM roles')
    }
  })

  async function insertTestRole(overrides: {
    id: string
    code: string
    name: string
    label: string
    isSystem?: boolean
    isActive?: boolean
  }) {
    const client = await getRawClient()
    if (client && 'execute' in client) {
      await client.execute({
        sql: `INSERT INTO roles (id, code, name, label, is_system, is_active, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          overrides.id,
          overrides.code,
          overrides.name,
          overrides.label,
          overrides.isSystem ? 1 : 0,
          overrides.isActive !== false ? 1 : 0,
          0,
          Date.now(),
          Date.now(),
        ],
      })
    }
  }

  describe('getAll', () => {
    it('should return empty array when no roles exist', async () => {
      const result = await service.getAll()

      expect(result).toEqual([])
      expect(Array.isArray(result)).toBe(true)
    })

    it('should return all roles including inactive ones', async () => {
      await insertTestRole({ id: 'r1', code: 'admin', name: 'Admin', label: 'Admin' })
      await insertTestRole({
        id: 'r2',
        code: 'guest',
        name: 'Guest',
        label: 'Guest',
        isActive: false,
      })

      const result = await service.getAll()

      expect(result).toHaveLength(2)
    })
  })

  describe('getActive', () => {
    it('should return only active roles', async () => {
      await insertTestRole({ id: 'r1', code: 'admin', name: 'Admin', label: 'Admin' })
      await insertTestRole({
        id: 'r2',
        code: 'guest',
        name: 'Guest',
        label: 'Guest',
        isActive: false,
      })

      const result = await service.getActive()

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('r1')
    })
  })

  describe('getById', () => {
    it('should return undefined for non-existent role', async () => {
      const result = await service.getById('non-existent')

      expect(result).toBeUndefined()
    })

    it('should return role by id with transformed dates', async () => {
      await insertTestRole({ id: 'r1', code: 'admin', name: 'Admin', label: 'Admin' })

      const result = await service.getById('r1')

      expect(result).toBeDefined()
      expect(result?.id).toBe('r1')
      expect(result?.code).toBe('admin')
      expect(result?.name).toBe('Admin')
      expect(typeof result?.createdAt).toBe('string')
      expect(typeof result?.updatedAt).toBe('string')
    })
  })

  describe('getByCode', () => {
    it('should return undefined for non-existent code', async () => {
      const result = await service.getByCode('non_existent')

      expect(result).toBeUndefined()
    })

    it('should return role by code', async () => {
      await insertTestRole({ id: 'r1', code: 'admin', name: 'Admin', label: 'Admin' })

      const result = await service.getByCode('admin')

      expect(result).toBeDefined()
      expect(result?.code).toBe('admin')
    })
  })

  describe('create', () => {
    it('should create a new role with all fields', async () => {
      const data = {
        id: 'role_test_1',
        code: 'test_role',
        name: 'Test Role',
        label: 'Test Role Label',
        description: 'A test role',
      }

      const result = await service.create(data)

      expect(result.id).toBe('role_test_1')
      expect(result.code).toBe('test_role')
      expect(result.name).toBe('Test Role')
      expect(result.label).toBe('Test Role Label')
      expect(result.description).toBe('A test role')
      expect(typeof result.createdAt).toBe('string')
      expect(typeof result.updatedAt).toBe('string')
    })

    it('should create role without optional fields', async () => {
      const data = {
        id: 'role_minimal',
        code: 'minimal',
        name: 'Minimal',
        label: 'Minimal',
      }

      const result = await service.create(data)

      expect(result.id).toBe('role_minimal')
      expect(result.code).toBe('minimal')
    })
  })

  describe('update', () => {
    it('should update role name and label', async () => {
      await insertTestRole({ id: 'r1', code: 'admin', name: 'Admin', label: 'Admin' })

      const result = await service.update('r1', { name: 'Super Admin', label: 'Super Admin' })

      expect(result).toBeDefined()
      expect(result?.name).toBe('Super Admin')
      expect(result?.label).toBe('Super Admin')
      expect(result?.code).toBe('admin')
    })

    it('should return undefined for non-existent role', async () => {
      const result = await service.update('non-existent', { name: 'Updated' })

      expect(result).toBeUndefined()
    })

    it('should update updatedAt timestamp', async () => {
      const client = await getRawClient()
      if (client && 'execute' in client) {
        await insertTestRole({ id: 'r1', code: 'admin', name: 'Admin', label: 'Admin' })
        await service.getById('r1')

        const result = await service.update('r1', { name: 'Updated Admin' })

        expect(result).toBeDefined()
        expect(result!.updatedAt).toBeDefined()
        expect(typeof result!.updatedAt).toBe('string')
      }
    })
  })

  describe('delete', () => {
    it('should soft-delete a non-system role', async () => {
      await insertTestRole({ id: 'r1', code: 'custom', name: 'Custom', label: 'Custom' })

      const result = await service.delete('r1')

      expect(result).toBe(true)

      const role = await service.getById('r1')
      expect(role?.isActive).toBe(false)
    })

    it('should return false for non-existent role', async () => {
      const result = await service.delete('non-existent')

      expect(result).toBe(false)
    })

    it('should return false for system role', async () => {
      await insertTestRole({
        id: 'r1',
        code: 'admin',
        name: 'Admin',
        label: 'Admin',
        isSystem: true,
      })

      const result = await service.delete('r1')

      expect(result).toBe(false)

      const role = await service.getById('r1')
      expect(role?.isActive).toBe(true)
    })
  })

  describe('assignRoleToUser', () => {
    it('should assign a role to a user', async () => {
      await insertTestRole({ id: 'r1', code: 'admin', name: 'Admin', label: 'Admin' })

      await service.assignRoleToUser('user-1', 'r1')

      const roles = await service.getUserRoles('user-1')
      expect(roles).toHaveLength(1)
      expect(roles[0].id).toBe('r1')
    })

    it('should not duplicate assignment if already assigned', async () => {
      await insertTestRole({ id: 'r1', code: 'admin', name: 'Admin', label: 'Admin' })

      await service.assignRoleToUser('user-1', 'r1')
      await service.assignRoleToUser('user-1', 'r1')

      const roles = await service.getUserRoles('user-1')
      expect(roles).toHaveLength(1)
    })

    it('should record assignedBy', async () => {
      await insertTestRole({ id: 'r1', code: 'admin', name: 'Admin', label: 'Admin' })

      await service.assignRoleToUser('user-1', 'r1', 'admin-user')

      const client = await getRawClient()
      if (client && 'execute' in client) {
        const result = await client.execute(
          'SELECT assigned_by FROM user_roles WHERE user_id = ? AND role_id = ?',
          ['user-1', 'r1']
        )
        const row = result.rows[0] as unknown as { assigned_by: string | null }
        expect(row.assigned_by).toBe('admin-user')
      }
    })
  })

  describe('revokeRoleFromUser', () => {
    it('should revoke a role from a user', async () => {
      await insertTestRole({ id: 'r1', code: 'admin', name: 'Admin', label: 'Admin' })
      await service.assignRoleToUser('user-1', 'r1')

      await service.revokeRoleFromUser('user-1', 'r1')

      const roles = await service.getUserRoles('user-1')
      expect(roles).toHaveLength(0)
    })
  })

  describe('getUserRoles', () => {
    it('should return empty array for user with no roles', async () => {
      const result = await service.getUserRoles('unknown-user')

      expect(result).toEqual([])
    })

    it('should return all active roles for a user', async () => {
      await insertTestRole({ id: 'r1', code: 'admin', name: 'Admin', label: 'Admin' })
      await insertTestRole({ id: 'r2', code: 'editor', name: 'Editor', label: 'Editor' })

      await service.assignRoleToUser('user-1', 'r1')
      await new Promise(resolve => setTimeout(resolve, 10))
      await service.assignRoleToUser('user-1', 'r2')

      const result = await service.getUserRoles('user-1')

      expect(result).toHaveLength(2)
      const ids = result.map(r => r.id)
      expect(ids).toContain('r1')
      expect(ids).toContain('r2')
    })

    it('should not return inactive roles', async () => {
      await insertTestRole({ id: 'r1', code: 'admin', name: 'Admin', label: 'Admin' })
      await insertTestRole({
        id: 'r2',
        code: 'inactive_role',
        name: 'Inactive',
        label: 'Inactive',
        isActive: false,
      })

      await service.assignRoleToUser('user-1', 'r1')
      const client = await getRawClient()
      if (client && 'execute' in client) {
        await client.execute({
          sql: `INSERT INTO user_roles (id, user_id, role_id, is_active, assigned_at) VALUES (?, ?, ?, ?, ?)`,
          args: ['ur_inactive', 'user-1', 'r2', 1, Date.now()],
        })
      }

      const result = await service.getUserRoles('user-1')

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('r1')
    })
  })
})

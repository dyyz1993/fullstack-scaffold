import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { createTestClient } from '../../test-utils/test-client'
import { getRawClient, getDb } from '../../db'
import { setupTestDatabase, cleanupTestDatabase } from '../../db/test-setup'

describe('Todo Routes with Type-Safe Test Client', () => {
  beforeAll(async () => {
    await setupTestDatabase()
    const db = await getDb()
    expect(db).toBeDefined()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    await cleanupTestDatabase()
  })

  afterEach(async () => {
    await cleanupTestDatabase()
  })

  describe('GET /api/todos', () => {
    it('should return empty array', async () => {
      const client = createTestClient()

      const res = await client.api.todos.$get()
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data).toEqual({ success: true, data: [] })
    })

    it('should return todos list', async () => {
      const client = await getRawClient()
      if (client && 'execute' in client) {
        const now = Date.now()
        await client.execute({
          sql: `INSERT INTO todos (title, status, created_at, updated_at) VALUES (?, ?, ?, ?)`,
          args: ['Test Todo', 'pending', now, now],
        })
      }

      const testClientApp = createTestClient()
      const res = await testClientApp.api.todos.$get()
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success && 'data' in data) {
        expect(data.data).toHaveLength(1)
        expect(data.data[0].title).toBe('Test Todo')
      }
    })
  })

  describe('POST /api/todos', () => {
    it('should create a todo with type safety', async () => {
      const client = createTestClient()

      const res = await client.api.todos.$post({
        json: {
          title: 'New Todo',
          description: 'Test',
        },
      })

      expect(res.status).toBe(201)

      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success && 'data' in data) {
        expect(data.data.title).toBe('New Todo')
        expect(data.data.description).toBe('Test')
      }
    })

    it('should reject empty title', async () => {
      const client = createTestClient()

      const res = await client.api.todos.$post({
        json: {
          title: '',
        },
      })

      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/todos/:id', () => {
    it('should return 404 for non-existent todo', async () => {
      const client = createTestClient()

      const res = await client.api.todos[':id'].$get({
        param: { id: '999' },
      })
      expect(res.status).toBe(404)
    })

    it('should return todo by id with type safety', async () => {
      const client = await getRawClient()
      if (client && 'execute' in client) {
        const now = Date.now()
        await client.execute({
          sql: `INSERT INTO todos (title, status, created_at, updated_at) VALUES (?, ?, ?, ?)`,
          args: ['Find Me', 'pending', now, now],
        })
        const result = await client.execute('SELECT id FROM todos WHERE title = ?', ['Find Me'])
        const row = result.rows[0] as unknown as { id: number }

        const testClientApp = createTestClient()
        const res = await testClientApp.api.todos[':id'].$get({
          param: { id: String(row.id) },
        })
        expect(res.status).toBe(200)

        const data = await res.json()
        expect(data.success).toBe(true)
        if (data.success && 'data' in data) {
          expect(data.data.title).toBe('Find Me')
        }
      }
    })
  })

  describe('PUT /api/todos/:id', () => {
    it('should update todo with type safety', async () => {
      const client = await getRawClient()
      if (client && 'execute' in client) {
        const now = Date.now()
        await client.execute({
          sql: `INSERT INTO todos (title, status, created_at, updated_at) VALUES (?, ?, ?, ?)`,
          args: ['Original', 'pending', now, now],
        })
        const result = await client.execute('SELECT id FROM todos WHERE title = ?', ['Original'])
        const row = result.rows[0] as unknown as { id: number }

        const testClientApp = createTestClient()
        const res = await testClientApp.api.todos[':id'].$put({
          param: { id: String(row.id) },
          json: {
            title: 'Updated',
            status: 'completed',
          },
        })

        expect(res.status).toBe(200)

        const data = await res.json()
        expect(data.success).toBe(true)
        if (data.success && 'data' in data) {
          expect(data.data.title).toBe('Updated')
          expect(data.data.status).toBe('completed')
        }
      }
    })
  })

  describe('DELETE /api/todos/:id', () => {
    it('should delete todo with type safety', async () => {
      const client = await getRawClient()
      if (client && 'execute' in client) {
        const now = Date.now()
        await client.execute({
          sql: `INSERT INTO todos (title, status, created_at, updated_at) VALUES (?, ?, ?, ?)`,
          args: ['To Delete', 'pending', now, now],
        })
        const result = await client.execute('SELECT id FROM todos WHERE title = ?', ['To Delete'])
        const row = result.rows[0] as unknown as { id: number }

        const testClientApp = createTestClient()
        const res = await testClientApp.api.todos[':id'].$delete({
          param: { id: String(row.id) },
        })
        expect(res.status).toBe(200)

        const data = await res.json()
        expect(data.success).toBe(true)
        if (data.success && 'data' in data) {
          expect(data.data.id).toBe(row.id)
        }
      }
    })
  })
})

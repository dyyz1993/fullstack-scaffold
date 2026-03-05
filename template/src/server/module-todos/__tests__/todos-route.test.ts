import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import app from '../../entries/node'
import { getRawClient, getDb } from '../../db'
import { setupTestDatabase, cleanupTestDatabase } from '../../db/test-setup'

describe('Todo Routes', () => {
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
      const res = await app.request('/api/todos')
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

      const res = await app.request('/api/todos')
      expect(res.status).toBe(200)

      const data = (await res.json()) as { success: boolean; data: Array<{ title: string }> }
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(1)
      expect(data.data[0].title).toBe('Test Todo')
    })
  })

  describe('POST /api/todos', () => {
    it('should create a todo', async () => {
      const res = await app.request('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Todo', description: 'Test' }),
      })

      expect(res.status).toBe(201)

      const data = (await res.json()) as {
        success: boolean
        data: { title: string; description: string }
      }
      expect(data.success).toBe(true)
      expect(data.data.title).toBe('New Todo')
      expect(data.data.description).toBe('Test')
    })

    it('should reject empty title', async () => {
      const res = await app.request('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '' }),
      })

      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/todos/:id', () => {
    it('should return 404 for non-existent todo', async () => {
      const res = await app.request('/api/todos/999')
      expect(res.status).toBe(404)
    })

    it('should return todo by id', async () => {
      const client = await getRawClient()
      if (client && 'execute' in client) {
        const now = Date.now()
        await client.execute({
          sql: `INSERT INTO todos (title, status, created_at, updated_at) VALUES (?, ?, ?, ?)`,
          args: ['Find Me', 'pending', now, now],
        })
        const result = await client.execute('SELECT id FROM todos WHERE title = ?', ['Find Me'])
        const row = result.rows[0] as unknown as { id: number }

        const res = await app.request(`/api/todos/${row.id}`)
        expect(res.status).toBe(200)

        const data = (await res.json()) as { success: boolean; data: { title: string } }
        expect(data.success).toBe(true)
        expect(data.data.title).toBe('Find Me')
      }
    })
  })

  describe('PUT /api/todos/:id', () => {
    it('should update todo', async () => {
      const client = await getRawClient()
      if (client && 'execute' in client) {
        const now = Date.now()
        await client.execute({
          sql: `INSERT INTO todos (title, status, created_at, updated_at) VALUES (?, ?, ?, ?)`,
          args: ['Original', 'pending', now, now],
        })
        const result = await client.execute('SELECT id FROM todos WHERE title = ?', ['Original'])
        const row = result.rows[0] as unknown as { id: number }

        const res = await app.request(`/api/todos/${row.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Updated', status: 'completed' }),
        })

        expect(res.status).toBe(200)

        const data = (await res.json()) as {
          success: boolean
          data: { title: string; status: string }
        }
        expect(data.success).toBe(true)
        expect(data.data.title).toBe('Updated')
        expect(data.data.status).toBe('completed')
      }
    })
  })

  describe('DELETE /api/todos/:id', () => {
    it('should delete todo', async () => {
      const client = await getRawClient()
      if (client && 'execute' in client) {
        const now = Date.now()
        await client.execute({
          sql: `INSERT INTO todos (title, status, created_at, updated_at) VALUES (?, ?, ?, ?)`,
          args: ['To Delete', 'pending', now, now],
        })
        const result = await client.execute('SELECT id FROM todos WHERE title = ?', ['To Delete'])
        const row = result.rows[0] as unknown as { id: number }

        const res = await app.request(`/api/todos/${row.id}`, { method: 'DELETE' })
        expect(res.status).toBe(200)

        const data = (await res.json()) as { success: boolean; data: { id: number } }
        expect(data.success).toBe(true)
        expect(data.data.id).toBe(row.id)
      }
    })
  })
})

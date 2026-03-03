import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import app from '../index';
import { getRawClient, getDb } from '../db';

describe('Integration: Todos API (Real Database)', () => {
  beforeAll(async () => {
    // 确保数据库连接和表结构
    const db = await getDb();
    expect(db).toBeDefined();
    console.log('[Integration] Database connected');
  });

  afterAll(async () => {
    // 清理所有测试数据
    const rawClient = await getRawClient();
    if (rawClient && 'execute' in rawClient) {
      await rawClient.execute('DELETE FROM todos');
      console.log('[Integration] All test data cleaned');
    }
  });

  beforeEach(async () => {
    // 每个测试前清空数据
    const rawClient = await getRawClient();
    if (rawClient && 'execute' in rawClient) {
      await rawClient.execute('DELETE FROM todos');
    }
  });

  afterEach(async () => {
    // 每个测试后清理数据
    const rawClient = await getRawClient();
    if (rawClient && 'execute' in rawClient) {
      await rawClient.execute('DELETE FROM todos');
    }
  });

  describe('Full CRUD Flow', () => {
    it('should handle complete todo lifecycle', async () => {
      // 1. List empty
      const listRes = await app.request('/api/todos');
      const listData = await listRes.json();
      expect(listData).toEqual({ success: true, data: [] });

      // 2. Create
      const createRes = await app.request('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Integration Todo', description: 'Full test' }),
      });
      expect(createRes.status).toBe(201);
      const created = await createRes.json() as { success: boolean; data: { id: number; title: string } };
      expect(created.success).toBe(true);
      expect(created.data.title).toBe('Integration Todo');

      // 3. Read
      const readRes = await app.request(`/api/todos/${created.data.id}`);
      const readData = await readRes.json() as { success: boolean; data: { title: string } };
      expect(readData.success).toBe(true);

      // 4. Update
      const updateRes = await app.request(`/api/todos/${created.data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      const updated = await updateRes.json() as { success: boolean; data: { status: string } };
      expect(updated.success).toBe(true);
      expect(updated.data.status).toBe('completed');

      // 5. Delete
      const deleteRes = await app.request(`/api/todos/${created.data.id}`, {
        method: 'DELETE',
      });
      const deleted = await deleteRes.json() as { success: boolean };
      expect(deleted.success).toBe(true);

      // 6. Verify deleted
      const verifyRes = await app.request(`/api/todos/${created.data.id}`);
      expect(verifyRes.status).toBe(404);
    });

    it('should handle concurrent requests', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        app.request('/api/todos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: `Concurrent Todo ${i}` }),
        })
      );

      const results = await Promise.all(promises);
      results.forEach((res) => {
        expect(res.status).toBe(201);
      });

      const listRes = await app.request('/api/todos');
      const listData = await listRes.json() as { success: boolean; data: unknown[] };
      expect(listData.data).toHaveLength(10);
    });
  });

  describe('Edge Cases', () => {
    it('should return 404 for non-existent todo', async () => {
      const res = await app.request('/api/todos/99999');
      expect(res.status).toBe(404);
    });

    it('should reject invalid todo data', async () => {
      const res = await app.request('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '' }),
      });
      expect(res.status).toBe(400);
    });
  });
});

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import app from '../../index';
import { getDb } from '../../db';
import { setupTestDatabase, cleanupTestDatabase } from '../../db/test-setup';

describe('Integration: Todos API (Real Database)', () => {
  beforeAll(async () => {
    await setupTestDatabase();
    const db = await getDb();
    expect(db).toBeDefined();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  describe('Full CRUD Flow', () => {
    it('should handle complete todo lifecycle', async () => {
      const listRes = await app.request('/api/todos');
      const listData = await listRes.json();
      expect(listData).toEqual({ success: true, data: [] });

      const createRes = await app.request('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Integration Todo', description: 'Full test' }),
      });
      expect(createRes.status).toBe(201);
      const created = await createRes.json() as { success: boolean; data: { id: number; title: string } };
      expect(created.success).toBe(true);
      expect(created.data.title).toBe('Integration Todo');

      const readRes = await app.request(`/api/todos/${created.data.id}`);
      const readData = await readRes.json() as { success: boolean; data: { title: string } };
      expect(readData.success).toBe(true);

      const updateRes = await app.request(`/api/todos/${created.data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      const updated = await updateRes.json() as { success: boolean; data: { status: string } };
      expect(updated.success).toBe(true);
      expect(updated.data.status).toBe('completed');

      const deleteRes = await app.request(`/api/todos/${created.data.id}`, {
        method: 'DELETE',
      });
      const deleted = await deleteRes.json() as { success: boolean };
      expect(deleted.success).toBe(true);

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

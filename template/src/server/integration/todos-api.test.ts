import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { serve } from '@hono/node-server';
import { hc } from 'hono/client';
import app, { type AppType } from '../index';
import { getRawClient } from '../db';

function isSuccess<T>(response: unknown): response is { success: true; data: T } {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    response.success === true &&
    'data' in response
  );
}

describe('Todo API Integration Tests', () => {
  let server: ReturnType<typeof serve>;
  let clientApi: ReturnType<typeof hc<typeof app>>;

  beforeAll(async () => {
    server = serve({
      fetch: app.fetch,
      port: 3011,
    });

    clientApi = hc<AppType>('http://localhost:3011');
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(async () => {
    const client = await getRawClient();
    if (client && 'execute' in client) {
      await client.execute('DELETE FROM todos');
    }
  });

  describe('GET /api/todos', () => {
    it('should return empty array when no todos exist', async () => {
      const response = await clientApi.api.todos.$get();
      const result = await response.json();

      expect(response.status).toBe(200);
      if (isSuccess(result)) {
        expect(result.data).toEqual([]);
      }
    });

    it('should return all todos', async () => {
      const now = Date.now();
      const client = await getRawClient();
      
      if (client && 'execute' in client) {
        await client.execute({
          sql: `INSERT INTO todos (title, status, created_at, updated_at) VALUES (?, ?, ?, ?)`,
          args: ['Todo 1', 'pending', now, now],
        });
        await client.execute({
          sql: `INSERT INTO todos (title, status, created_at, updated_at) VALUES (?, ?, ?, ?)`,
          args: ['Todo 2', 'completed', now, now],
        });
      }

      const response = await clientApi.api.todos.$get();
      const result = await response.json();

      expect(response.status).toBe(200);
      if (isSuccess(result)) {
        expect(result.data).toHaveLength(2);
      }
    });
  });

  describe('GET /api/todos/:id', () => {
    it('should return 404 for non-existent todo', async () => {
      const response = await clientApi.api.todos[':id'].$get({
        param: { id: '999' },
      });

      expect(response.status).toBe(404);
    });

    it('should return todo by id', async () => {
      const now = Date.now();
      const client = await getRawClient();
      
      if (client && 'execute' in client) {
        await client.execute({
          sql: `INSERT INTO todos (title, status, created_at, updated_at) VALUES (?, ?, ?, ?)`,
          args: ['Test Todo', 'pending', now, now],
        });

        const newTodo = await client.execute('SELECT id FROM todos WHERE title = ?', ['Test Todo']);
        const row = newTodo.rows[0] as unknown as { id: number };

        const response = await clientApi.api.todos[':id'].$get({
          param: { id: row.id.toString() },
        });
        const result = await response.json();

        expect(response.status).toBe(200);
        if (isSuccess(result)) {
          expect((result.data as { title: string }).title).toBe('Test Todo');
        }
      }
    });
  });

  describe('POST /api/todos', () => {
    it('should create a new todo', async () => {
      const input = {
        title: 'New Todo',
        description: 'Test description',
      };

      const response = await clientApi.api.todos.$post({
        json: input,
      });
      const result = await response.json();

      expect(response.status).toBe(201);
      if (isSuccess(result)) {
        expect((result.data as { title: string }).title).toBe(input.title);
        expect((result.data as { description: string }).description).toBe(input.description);
      }
    });

    it('should return 400 for invalid input', async () => {
      const response = await clientApi.api.todos.$post({
        json: { title: '' },
      });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/todos/:id', () => {
    it('should update todo', async () => {
      const now = Date.now();
      const client = await getRawClient();
      
      if (client && 'execute' in client) {
        await client.execute({
          sql: `INSERT INTO todos (title, status, created_at, updated_at) VALUES (?, ?, ?, ?)`,
          args: ['Original Title', 'pending', now, now],
        });

        const newTodo = await client.execute('SELECT id FROM todos WHERE title = ?', ['Original Title']);
        const row = newTodo.rows[0] as unknown as { id: number };

        const updates = {
          title: 'Updated Title',
          status: 'completed' as const,
        };

        const response = await clientApi.api.todos[':id'].$put({
          param: { id: row.id.toString() },
          json: updates,
        });
        const result = await response.json();

        expect(response.status).toBe(200);
        if (isSuccess(result)) {
          expect((result.data as { title: string }).title).toBe(updates.title);
          expect((result.data as { status: string }).status).toBe(updates.status);
        }
      }
    });

    it('should return 404 for non-existent todo', async () => {
      const response = await clientApi.api.todos[':id'].$put({
        param: { id: '999' },
        json: { title: 'Updated' },
      });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/todos/:id', () => {
    it('should delete todo', async () => {
      const now = Date.now();
      const client = await getRawClient();
      
      if (client && 'execute' in client) {
        await client.execute({
          sql: `INSERT INTO todos (title, status, created_at, updated_at) VALUES (?, ?, ?, ?)`,
          args: ['To Delete', 'pending', now, now],
        });

        const newTodo = await client.execute('SELECT id FROM todos WHERE title = ?', ['To Delete']);
        const row = newTodo.rows[0] as unknown as { id: number };

        const response = await clientApi.api.todos[':id'].$delete({
          param: { id: row.id.toString() },
        });
        const result = await response.json();

        expect(response.status).toBe(200);
        if (isSuccess(result)) {
          expect((result.data as { id: number }).id).toBe(row.id);
        }
      }
    });

    it('should return 404 for non-existent todo', async () => {
      const response = await clientApi.api.todos[':id'].$delete({
        param: { id: '999' },
      });

      expect(response.status).toBe(404);
    });
  });
});

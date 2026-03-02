/**
 * Unit tests for Todo service
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as todoService from '../services/todo-service';
import { sqlite } from '../../shared/db';

describe('Todo Service', () => {
  beforeEach(async () => {
    sqlite.exec('DELETE FROM todos');
  });

  afterEach(async () => {
    sqlite.exec('DELETE FROM todos');
  });

  describe('listTodos', () => {
    it('should return empty array when no todos exist', async () => {
      const result = await todoService.listTodos();
      expect(result).toEqual([]);
    });

    it('should return all todos ordered by created_at DESC', async () => {
      const now = Date.now();
      sqlite.exec(`
        INSERT INTO todos (title, status, created_at, updated_at)
        VALUES 
          ('Todo 1', 'pending', ${now}, ${now}),
          ('Todo 2', 'completed', ${now + 1000}, ${now + 1000})
      `);

      const result = await todoService.listTodos();
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Todo 2');
      expect(result[1].title).toBe('Todo 1');
    });
  });

  describe('getTodo', () => {
    it('should return null for non-existent todo', async () => {
      const result = await todoService.getTodo(999);
      expect(result).toBeNull();
    });

    it('should return todo by id with correct fields', async () => {
      const now = Date.now();
      sqlite.exec(`INSERT INTO todos (title, status, created_at, updated_at) VALUES ('Test Todo', 'pending', ${now}, ${now})`);
      const row = sqlite.prepare('SELECT id FROM todos WHERE title = ?').get('Test Todo') as { id: number };

      const result = await todoService.getTodo(row.id);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(row.id);
      expect(result?.title).toBe('Test Todo');
      expect(result?.status).toBe('pending');
    });
  });

  describe('createTodo', () => {
    it('should create a new todo with default status', async () => {
      const input = {
        title: 'New Todo',
        description: 'Test description',
      };

      const result = await todoService.createTodo(input);

      expect(result.id).toBeGreaterThan(0);
      expect(result.title).toBe(input.title);
      expect(result.description).toBe(input.description);
      expect(result.status).toBe('pending');
    });

    it('should create todo without description', async () => {
      const input = {
        title: 'Todo without description',
      };

      const result = await todoService.createTodo(input);

      expect(result.title).toBe(input.title);
      expect(result.description).toBeUndefined();
    });
  });

  describe('updateTodo', () => {
    it('should update todo title and status', async () => {
      const now = Date.now();
      sqlite.exec(`INSERT INTO todos (title, status, created_at, updated_at) VALUES ('Original Title', 'pending', ${now}, ${now})`);
      const row = sqlite.prepare('SELECT id FROM todos WHERE title = ?').get('Original Title') as { id: number };

      const updates = {
        title: 'Updated Title',
        status: 'completed' as const,
      };

      const result = await todoService.updateTodo(row.id, updates);

      expect(result).not.toBeNull();
      expect(result?.title).toBe(updates.title);
      expect(result?.status).toBe(updates.status);
    });

    it('should return null for non-existent todo', async () => {
      const result = await todoService.updateTodo(999, { title: 'Updated' });
      expect(result).toBeNull();
    });
  });

  describe('deleteTodo', () => {
    it('should delete todo and return true', async () => {
      const now = Date.now();
      sqlite.exec(`INSERT INTO todos (title, status, created_at, updated_at) VALUES ('To Delete', 'pending', ${now}, ${now})`);
      const row = sqlite.prepare('SELECT id FROM todos WHERE title = ?').get('To Delete') as { id: number };

      const result = await todoService.deleteTodo(row.id);

      expect(result).toBe(true);

      const deleted = sqlite.prepare('SELECT * FROM todos WHERE id = ?').get(row.id);
      expect(deleted).toBeUndefined();
    });

    it('should return false for non-existent todo', async () => {
      const result = await todoService.deleteTodo(999);
      expect(result).toBe(false);
    });
  });
});

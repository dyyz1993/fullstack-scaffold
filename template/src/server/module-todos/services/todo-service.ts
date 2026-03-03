import { eq, desc } from 'drizzle-orm';
import type { Todo, CreateTodoInput, UpdateTodoInput } from '@shared/types';
import { getDb } from '../../db';
import { todos, type TodoTable } from '../../db/schema';

export async function listTodos(): Promise<Todo[]> {
  const db = await getDb();
  const rows = await db.select().from(todos).orderBy(desc(todos.createdAt));
  return rows.map((row: TodoTable) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

export async function getTodo(id: number): Promise<Todo | null> {
  const db = await getDb();
  const rows = await db.select().from(todos).where(eq(todos.id, id));
  const row = rows[0];

  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function createTodo(input: CreateTodoInput): Promise<Todo> {
  const db = await getDb();
  const now = new Date();
  const result = await db.insert(todos).values({
    title: input.title,
    description: input.description ?? null,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  }).returning();

  const row = result[0];
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function updateTodo(
  id: number,
  input: UpdateTodoInput
): Promise<Todo | null> {
  const db = await getDb();
  const now = new Date();
  const updateData: Partial<TodoTable> = {
    updatedAt: now,
  };

  if (input.title !== undefined) {
    updateData.title = input.title;
  }
  if (input.description !== undefined) {
    updateData.description = input.description;
  }
  if (input.status !== undefined) {
    updateData.status = input.status;
  }

  const result = await db
    .update(todos)
    .set(updateData)
    .where(eq(todos.id, id))
    .returning();

  if (result.length === 0) return null;

  const row = result[0];
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function deleteTodo(id: number): Promise<boolean> {
  const db = await getDb();
  const result = await db.delete(todos).where(eq(todos.id, id)).returning();
  return result.length > 0;
}

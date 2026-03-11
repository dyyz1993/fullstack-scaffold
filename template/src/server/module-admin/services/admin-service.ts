import { getDb, getRawClient } from '../../db'
import { todos } from '../../db/schema'
import { desc } from 'drizzle-orm'
import { toISOString } from '../../utils/date'

export interface SystemStats {
  totalTodos: number
  pendingTodos: number
  completedTodos: number
  lastUpdated: string
}

export interface HealthCheckResult {
  database: 'connected' | 'disconnected'
  timestamp: string
}

export async function getSystemStats(): Promise<SystemStats> {
  const rawClient = await getRawClient()

  if (rawClient && 'execute' in rawClient) {
    const totalResult = await rawClient.execute('SELECT COUNT(*) as count FROM todos')
    const pendingResult = await rawClient.execute(
      "SELECT COUNT(*) as count FROM todos WHERE status = 'pending'"
    )
    const completedResult = await rawClient.execute(
      "SELECT COUNT(*) as count FROM todos WHERE status = 'completed'"
    )

    const getCount = (rows: unknown[]) => {
      const row = rows[0] as Record<string, unknown> | undefined
      return typeof row?.count === 'number' ? row.count : 0
    }

    return {
      totalTodos: getCount(totalResult.rows),
      pendingTodos: getCount(pendingResult.rows),
      completedTodos: getCount(completedResult.rows),
      lastUpdated: new Date().toISOString(),
    }
  }

  const db = await getDb()
  const allTodos = await db.select().from(todos)

  return {
    totalTodos: allTodos.length,
    pendingTodos: allTodos.filter(t => t.status === 'pending').length,
    completedTodos: allTodos.filter(t => t.status === 'completed').length,
    lastUpdated: new Date().toISOString(),
  }
}

export async function checkDatabaseHealth(): Promise<HealthCheckResult> {
  try {
    const db = await getDb()
    await db.select().from(todos).limit(1)
    return {
      database: 'connected',
      timestamp: new Date().toISOString(),
    }
  } catch {
    return {
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    }
  }
}

export async function clearAllTodos(): Promise<{ deletedCount: number }> {
  const db = await getDb()
  const result = await db.delete(todos).returning()
  return { deletedCount: result.length }
}

export async function getRecentActivity(limit: number = 10): Promise<
  Array<{
    id: number
    title: string
    status: string
    updatedAt: string
  }>
> {
  const db = await getDb()
  const results = await db.select().from(todos).orderBy(desc(todos.updatedAt)).limit(limit)

  return results.map(r => ({
    id: r.id,
    title: r.title,
    status: r.status,
    updatedAt: toISOString(r.updatedAt),
  }))
}

import { getRawClient } from '@server/db'
import { getDb } from '@server/db'
import { plugins } from '@server/db/schema'
import type { AdminDashboardStats } from '@shared/schemas'
import { mapRow } from './plugin-service'

export async function getDashboardStats(): Promise<AdminDashboardStats> {
  const client = await getRawClient()

  if (!client || !('execute' in client)) {
    return {
      totalPlugins: 0,
      pendingPlugins: 0,
      totalDownloads: 0,
      totalDevelopers: 0,
      totalCategories: 0,
    }
  }

  const [totalResult, pendingResult, downloadResult, developerResult, categoryResult] =
    await Promise.all([
      client.execute('SELECT COUNT(*) as count FROM plugins'),
      client.execute("SELECT COUNT(*) as count FROM plugins WHERE status = 'pending'"),
      client.execute('SELECT COALESCE(SUM(download_count), 0) as total FROM plugins'),
      client.execute('SELECT COUNT(DISTINCT author_id) as count FROM plugins'),
      client.execute('SELECT COUNT(*) as count FROM plugin_categories'),
    ])

  const db = await getDb()
  const recentRows = await db.select().from(plugins).orderBy(plugins.createdAt).limit(5)
  const recentSubmissions = recentRows.map(mapRow)

  return {
    totalPlugins: (totalResult.rows[0] as unknown as { count: number })?.count ?? 0,
    pendingPlugins: (pendingResult.rows[0] as unknown as { count: number })?.count ?? 0,
    totalDownloads: (downloadResult.rows[0] as unknown as { total: number })?.total ?? 0,
    totalDevelopers: (developerResult.rows[0] as unknown as { count: number })?.count ?? 0,
    totalCategories: (categoryResult.rows[0] as unknown as { count: number })?.count ?? 0,
    recentSubmissions,
  }
}

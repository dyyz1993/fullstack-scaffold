import { getRawClient } from './index'

export async function setupTestDatabase(): Promise<void> {
  const client = await getRawClient()

  if (!client || !('execute' in client)) {
    throw new Error('Test database client not available')
  }

  const migrationSQL = `
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending' NOT NULL,
      created_at INTEGER DEFAULT (unixepoch() * 1000) NOT NULL,
      updated_at INTEGER DEFAULT (unixepoch() * 1000) NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER DEFAULT false NOT NULL,
      created_at INTEGER DEFAULT (unixepoch() * 1000) NOT NULL
    );
  `

  const statements = migrationSQL.split(';').filter(s => s.trim())

  for (const statement of statements) {
    if (statement.trim()) {
      await client.execute(statement)
    }
  }
}

export async function cleanupTestDatabase(): Promise<void> {
  const client = await getRawClient()

  if (client && 'execute' in client) {
    await client.execute('DELETE FROM todos')
    await client.execute('DELETE FROM notifications')
  }
}

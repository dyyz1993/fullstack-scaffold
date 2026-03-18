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
    
    CREATE TABLE IF NOT EXISTS todo_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      todo_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      path TEXT NOT NULL,
      uploaded_by TEXT,
      created_at INTEGER DEFAULT (unixepoch() * 1000) NOT NULL,
      FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER DEFAULT false NOT NULL,
      created_at INTEGER DEFAULT (unixepoch() * 1000) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY NOT NULL,
      code TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      category TEXT NOT NULL,
      is_active INTEGER DEFAULT true NOT NULL,
      created_at INTEGER DEFAULT (unixepoch() * 1000) NOT NULL,
      updated_at INTEGER DEFAULT (unixepoch() * 1000) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY NOT NULL,
      code TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      is_active INTEGER DEFAULT true NOT NULL,
      created_at INTEGER DEFAULT (unixepoch() * 1000) NOT NULL,
      updated_at INTEGER DEFAULT (unixepoch() * 1000) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS role_permissions (
      id TEXT PRIMARY KEY NOT NULL,
      role_id TEXT NOT NULL,
      permission_id TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch() * 1000) NOT NULL,
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_roles (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch() * 1000) NOT NULL,
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
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
    await client.execute('DELETE FROM todo_attachments')
    await client.execute('DELETE FROM todos')
    await client.execute('DELETE FROM notifications')
    await client.execute('DELETE FROM role_permissions')
    await client.execute('DELETE FROM user_roles')
    await client.execute('DELETE FROM permissions')
    await client.execute('DELETE FROM roles')
  }
}

import { getRawClient } from './index'
import type { Client } from '@libsql/client'

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
      name TEXT NOT NULL,
      label TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT true,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY NOT NULL,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      label TEXT NOT NULL,
      description TEXT,
      is_system INTEGER DEFAULT false,
      is_active INTEGER DEFAULT true,
      sort_order INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id TEXT NOT NULL,
      permission_id TEXT NOT NULL,
      created_at INTEGER,
      PRIMARY KEY(role_id, permission_id),
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_roles (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      assigned_by TEXT,
      assigned_at INTEGER,
      expires_at INTEGER,
      is_active INTEGER DEFAULT true,
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS routes (
      id TEXT PRIMARY KEY NOT NULL,
      path TEXT NOT NULL,
      method TEXT NOT NULL,
      name TEXT,
      description TEXT,
      module TEXT,
      is_public INTEGER DEFAULT false,
      is_active INTEGER DEFAULT true,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS permission_routes (
      permission_id TEXT NOT NULL,
      route_id TEXT NOT NULL,
      created_at INTEGER,
      PRIMARY KEY(permission_id, route_id),
      FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
      FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS permission_audit_logs (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      old_value TEXT,
      new_value TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      order_no TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      product_name TEXT NOT NULL,
      amount INTEGER NOT NULL,
      status TEXT DEFAULT 'pending' NOT NULL,
      created_at INTEGER DEFAULT (unixepoch() * 1000) NOT NULL,
      updated_at INTEGER DEFAULT (unixepoch() * 1000) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      ticket_no TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT DEFAULT 'open' NOT NULL,
      priority TEXT DEFAULT 'medium' NOT NULL,
      category TEXT NOT NULL,
      assigned_to TEXT,
      created_at INTEGER DEFAULT (unixepoch() * 1000) NOT NULL,
      updated_at INTEGER DEFAULT (unixepoch() * 1000) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ticket_replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      ticket_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      author TEXT NOT NULL,
      is_customer INTEGER DEFAULT 0 NOT NULL,
      created_at INTEGER DEFAULT (unixepoch() * 1000) NOT NULL,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS disputes (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      dispute_no TEXT NOT NULL,
      order_id TEXT NOT NULL,
      order_no TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'pending' NOT NULL,
      description TEXT NOT NULL,
      resolution TEXT,
      amount INTEGER NOT NULL,
      resolved_at INTEGER,
      resolved_by TEXT,
      created_at INTEGER DEFAULT (unixepoch() * 1000) NOT NULL,
      updated_at INTEGER DEFAULT (unixepoch() * 1000) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contents (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      excerpt TEXT,
      category TEXT NOT NULL,
      tags TEXT,
      status TEXT DEFAULT 'draft' NOT NULL,
      author TEXT NOT NULL,
      view_count INTEGER DEFAULT 0 NOT NULL,
      like_count INTEGER DEFAULT 0 NOT NULL,
      published_at INTEGER,
      created_at INTEGER DEFAULT (unixepoch() * 1000) NOT NULL,
      updated_at INTEGER DEFAULT (unixepoch() * 1000) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS developers (
      id TEXT PRIMARY KEY NOT NULL,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'developer' NOT NULL,
      api_key TEXT NOT NULL UNIQUE,
      created_at INTEGER DEFAULT (unixepoch() * 1000) NOT NULL,
      updated_at INTEGER DEFAULT (unixepoch() * 1000) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS plugins (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      readme TEXT,
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      repository_url TEXT,
      homepage_url TEXT,
      npm_package TEXT,
      license TEXT,
      version TEXT NOT NULL DEFAULT '0.0.1',
      status TEXT NOT NULL DEFAULT 'pending',
      download_count INTEGER NOT NULL DEFAULT 0,
      view_count INTEGER NOT NULL DEFAULT 0,
      featured INTEGER NOT NULL DEFAULT 0,
      screenshot_url TEXT,
      site_urls TEXT,
      tags TEXT,
      commands TEXT,
      reject_reason TEXT,
      created_at INTEGER DEFAULT (unixepoch() * 1000) NOT NULL,
      updated_at INTEGER DEFAULT (unixepoch() * 1000) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS plugin_versions (
      id TEXT PRIMARY KEY NOT NULL,
      plugin_id TEXT NOT NULL,
      version TEXT NOT NULL,
      changelog TEXT,
      package_url TEXT,
      file_size INTEGER,
      checksum TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      published_at INTEGER DEFAULT (unixepoch() * 1000) NOT NULL,
      FOREIGN KEY (plugin_id) REFERENCES plugins(id) ON DELETE CASCADE,
      UNIQUE(plugin_id, version)
    );

    CREATE TABLE IF NOT EXISTS plugin_reviews (
      id TEXT PRIMARY KEY NOT NULL,
      plugin_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      rating INTEGER NOT NULL,
      title TEXT,
      content TEXT,
      created_at INTEGER DEFAULT (unixepoch() * 1000) NOT NULL,
      FOREIGN KEY (plugin_id) REFERENCES plugins(id) ON DELETE CASCADE,
      UNIQUE(plugin_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS plugin_categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      icon TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS plugin_category_mappings (
      plugin_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      FOREIGN KEY (plugin_id) REFERENCES plugins(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES plugin_categories(id) ON DELETE CASCADE,
      UNIQUE(plugin_id, category_id)
    );
  `

  const statements = migrationSQL.split(';').filter(s => s.trim())

  for (const statement of statements) {
    if (statement.trim()) {
      try {
        await client.execute(statement)
      } catch {
        // Ignore errors for existing tables/indexes
      }
    }
  }

  // Insert default roles and permissions
  await seedTestData(client)
}

async function seedTestData(client: Client): Promise<void> {
  // Insert default roles - names must match test expectations
  const roles = [
    {
      id: 'role_super_admin',
      code: 'super_admin',
      name: '超级管理员',
      label: '超级管理员',
      is_system: 1,
      sort_order: 1,
    },
    {
      id: 'role_admin',
      code: 'admin',
      name: '管理员',
      label: '管理员',
      is_system: 1,
      sort_order: 2,
    },
    {
      id: 'role_user',
      code: 'user',
      name: '普通用户',
      label: '普通用户',
      is_system: 0,
      sort_order: 3,
    },
    {
      id: 'role_customer_service',
      code: 'customer_service',
      name: '客服人员',
      label: '客服',
      is_system: 0,
      sort_order: 4,
    },
  ]

  for (const role of roles) {
    try {
      await client.execute({
        sql: `INSERT OR IGNORE INTO roles (id, code, name, label, is_system, is_active, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          role.id,
          role.code,
          role.name,
          role.label,
          role.is_system,
          1,
          role.sort_order,
          Date.now(),
          Date.now(),
        ],
      })
    } catch {
      // Ignore duplicate errors
    }
  }

  // Insert default permissions - user category (4 permissions)
  const userPermissions = [
    {
      id: 'perm_user_view',
      code: 'user:view',
      name: '查看用户',
      label: '查看用户',
      category: 'user',
    },
    {
      id: 'perm_user_create',
      code: 'user:create',
      name: '创建用户',
      label: '创建用户',
      category: 'user',
    },
    {
      id: 'perm_user_update',
      code: 'user:update',
      name: '更新用户',
      label: '更新用户',
      category: 'user',
    },
    {
      id: 'perm_user_delete',
      code: 'user:delete',
      name: '删除用户',
      label: '删除用户',
      category: 'user',
    },
  ]

  // content category (4 permissions)
  const contentPermissions = [
    {
      id: 'perm_content_view',
      code: 'content:view',
      name: '查看内容',
      label: '查看内容',
      category: 'content',
    },
    {
      id: 'perm_content_create',
      code: 'content:create',
      name: '创建内容',
      label: '创建内容',
      category: 'content',
    },
    {
      id: 'perm_content_update',
      code: 'content:update',
      name: '更新内容',
      label: '更新内容',
      category: 'content',
    },
    {
      id: 'perm_content_delete',
      code: 'content:delete',
      name: '删除内容',
      label: '删除内容',
      category: 'content',
    },
  ]

  // system category (3 permissions)
  const systemPermissions = [
    {
      id: 'perm_system_settings',
      code: 'system:settings',
      name: '系统设置',
      label: '系统设置',
      category: 'system',
    },
    {
      id: 'perm_system_logs',
      code: 'system:logs',
      name: '查看日志',
      label: '查看日志',
      category: 'system',
    },
    {
      id: 'perm_system_backup',
      code: 'system:backup',
      name: '系统备份',
      label: '系统备份',
      category: 'system',
    },
  ]

  // order category (5 permissions)
  const orderPermissions = [
    {
      id: 'perm_order_view',
      code: 'order:view',
      name: '查看订单',
      label: '查看订单',
      category: 'order',
    },
    {
      id: 'perm_order_create',
      code: 'order:create',
      name: '创建订单',
      label: '创建订单',
      category: 'order',
    },
    {
      id: 'perm_order_edit',
      code: 'order:edit',
      name: '编辑订单',
      label: '编辑订单',
      category: 'order',
    },
    {
      id: 'perm_order_delete',
      code: 'order:delete',
      name: '删除订单',
      label: '删除订单',
      category: 'order',
    },
    {
      id: 'perm_order_process',
      code: 'order:process',
      name: '处理订单',
      label: '处理订单',
      category: 'order',
    },
  ]

  // ticket category (6 permissions)
  const ticketPermissions = [
    {
      id: 'perm_ticket_view',
      code: 'ticket:view',
      name: '查看工单',
      label: '查看工单',
      category: 'ticket',
    },
    {
      id: 'perm_ticket_create',
      code: 'ticket:create',
      name: '创建工单',
      label: '创建工单',
      category: 'ticket',
    },
    {
      id: 'perm_ticket_edit',
      code: 'ticket:edit',
      name: '编辑工单',
      label: '编辑工单',
      category: 'ticket',
    },
    {
      id: 'perm_ticket_delete',
      code: 'ticket:delete',
      name: '删除工单',
      label: '删除工单',
      category: 'ticket',
    },
    {
      id: 'perm_ticket_reply',
      code: 'ticket:reply',
      name: '回复工单',
      label: '回复工单',
      category: 'ticket',
    },
    {
      id: 'perm_ticket_close',
      code: 'ticket:close',
      name: '关闭工单',
      label: '关闭工单',
      category: 'ticket',
    },
  ]

  // data category (2 permissions)
  const dataPermissions = [
    {
      id: 'perm_data_export',
      code: 'data:export',
      name: '导出数据',
      label: '导出数据',
      category: 'data',
    },
    {
      id: 'perm_data_import',
      code: 'data:import',
      name: '导入数据',
      label: '导入数据',
      category: 'data',
    },
  ]

  // dispute category (5 permissions)
  const disputePermissions = [
    {
      id: 'perm_dispute_view',
      code: 'dispute:view',
      name: '查看争议',
      label: '查看争议',
      category: 'dispute',
    },
    {
      id: 'perm_dispute_create',
      code: 'dispute:create',
      name: '创建争议',
      label: '创建争议',
      category: 'dispute',
    },
    {
      id: 'perm_dispute_edit',
      code: 'dispute:edit',
      name: '编辑争议',
      label: '编辑争议',
      category: 'dispute',
    },
    {
      id: 'perm_dispute_delete',
      code: 'dispute:delete',
      name: '删除争议',
      label: '删除争议',
      category: 'dispute',
    },
    {
      id: 'perm_dispute_resolve',
      code: 'dispute:resolve',
      name: '解决争议',
      label: '解决争议',
      category: 'dispute',
    },
  ]

  // Combine all permissions
  const allPermissions = [
    ...userPermissions,
    ...contentPermissions,
    ...systemPermissions,
    ...orderPermissions,
    ...ticketPermissions,
    ...dataPermissions,
    ...disputePermissions,
  ]

  for (const perm of allPermissions) {
    try {
      await client.execute({
        sql: `INSERT OR IGNORE INTO permissions (id, code, name, label, category, is_active, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          perm.id,
          perm.code,
          perm.name,
          perm.label,
          perm.category,
          1,
          0,
          Date.now(),
          Date.now(),
        ],
      })
    } catch {
      // Ignore duplicate errors
    }
  }

  // Assign permissions to roles
  // Super admin gets all permissions
  for (const perm of allPermissions) {
    try {
      await client.execute({
        sql: `INSERT OR IGNORE INTO role_permissions (role_id, permission_id, created_at) VALUES (?, ?, ?)`,
        args: ['role_super_admin', perm.id, Date.now()],
      })
    } catch {
      // Ignore duplicate errors
    }
  }

  // Admin gets most permissions except system settings
  for (const perm of allPermissions) {
    if (perm.code !== 'system:settings') {
      try {
        await client.execute({
          sql: `INSERT OR IGNORE INTO role_permissions (role_id, permission_id, created_at) VALUES (?, ?, ?)`,
          args: ['role_admin', perm.id, Date.now()],
        })
      } catch {
        // Ignore duplicate errors
      }
    }
  }

  // Customer service gets view permissions for user, content, order, ticket + reply and close for ticket
  const customerServicePermissions = [
    'perm_user_view',
    'perm_content_view',
    'perm_order_view',
    'perm_order_create',
    'perm_order_edit',
    'perm_order_delete',
    'perm_order_process',
    'perm_ticket_view',
    'perm_ticket_create',
    'perm_ticket_edit',
    'perm_ticket_delete',
    'perm_ticket_reply',
    'perm_ticket_close',
    'perm_dispute_view',
    'perm_dispute_create',
    'perm_dispute_edit',
    'perm_dispute_delete',
    'perm_dispute_resolve',
  ]
  for (const permId of customerServicePermissions) {
    try {
      await client.execute({
        sql: `INSERT OR IGNORE INTO role_permissions (role_id, permission_id, created_at) VALUES (?, ?, ?)`,
        args: ['role_customer_service', permId, Date.now()],
      })
    } catch {
      // Ignore duplicate errors
    }
  }

  // Assign test user-role mappings for dev token users
  const testUserRoles = [
    { userId: 'super-admin-1', roleId: 'role_super_admin' },
    { userId: 'customer-service-1', roleId: 'role_customer_service' },
    { userId: 'user-1', roleId: 'role_user' },
  ]
  for (const mapping of testUserRoles) {
    try {
      await client.execute({
        sql: `INSERT OR IGNORE INTO user_roles (id, user_id, role_id, is_active, assigned_at) VALUES (?, ?, ?, ?, ?)`,
        args: [`ur_${mapping.userId}`, mapping.userId, mapping.roleId, 1, Date.now()],
      })
    } catch {
      // Ignore duplicate errors
    }
  }

  // User gets limited permissions - view content and order
  const userPermissionsList = ['perm_content_view', 'perm_order_view']
  for (const permId of userPermissionsList) {
    try {
      await client.execute({
        sql: `INSERT OR IGNORE INTO role_permissions (role_id, permission_id, created_at) VALUES (?, ?, ?)`,
        args: ['role_user', permId, Date.now()],
      })
    } catch {
      // Ignore duplicate errors
    }
  }
}

export async function cleanupTestDatabase(): Promise<void> {
  const client = await getRawClient()

  if (client && 'execute' in client) {
    try {
      await client.execute('DELETE FROM todo_attachments')
    } catch {
      // Table may not exist in some test environments
    }
    await client.execute('DELETE FROM todos')
    await client.execute('DELETE FROM notifications')
    await client.execute('DELETE FROM permission_routes')
    await client.execute('DELETE FROM permission_audit_logs')
    await client.execute('DELETE FROM role_permissions')
    await client.execute('DELETE FROM user_roles')
    await client.execute('DELETE FROM permissions')
    await client.execute('DELETE FROM roles')
    await client.execute('DELETE FROM routes')
    await client.execute('DELETE FROM ticket_replies')
    await client.execute('DELETE FROM tickets')
    await client.execute('DELETE FROM orders')
    await client.execute('DELETE FROM disputes')
    await client.execute('DELETE FROM contents')
    await client.execute('DELETE FROM plugin_category_mappings')
    await client.execute('DELETE FROM plugin_reviews')
    await client.execute('DELETE FROM plugin_versions')
    await client.execute('DELETE FROM plugins')
    await client.execute('DELETE FROM plugin_categories')
    await client.execute('DELETE FROM developers')
  }
}

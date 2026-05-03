import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const permissionAuditLogs = sqliteTable(
  'permission_audit_logs',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    action: text('action').notNull(),
    resourceType: text('resource_type').notNull(),
    resourceId: text('resource_id'),
    oldValue: text('old_value'),
    newValue: text('new_value'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  table => ({
    idxAuditUserCreated: index('idx_audit_user_created').on(table.userId, table.createdAt),
  })
)

export type PermissionAuditLog = typeof permissionAuditLogs.$inferSelect
export type NewPermissionAuditLog = typeof permissionAuditLogs.$inferInsert

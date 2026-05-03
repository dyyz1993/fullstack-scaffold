import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { roles } from './roles'

export const userRoles = sqliteTable(
  'user_roles',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    roleId: text('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    assignedBy: text('assigned_by'),
    assignedAt: integer('assigned_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    expiresAt: integer('expires_at', { mode: 'timestamp' }),
    isActive: integer('is_active', { mode: 'boolean' }).default(true),
  },
  table => ({
    idxUserRolesUserId: index('idx_user_roles_user_id').on(table.userId),
  })
)

export type UserRole = typeof userRoles.$inferSelect
export type NewUserRole = typeof userRoles.$inferInsert

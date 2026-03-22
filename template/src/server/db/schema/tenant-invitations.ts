import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { tenants } from './tenants'
import { tenantRoles } from './tenant-roles'

export const tenantInvitations = sqliteTable('tenant_invitations', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  roleId: text('role_id')
    .notNull()
    .references(() => tenantRoles.id, { onDelete: 'cascade' }),
  inviterId: text('inviter_id').notNull(),
  token: text('token').notNull().unique(),
  status: text('status').notNull().default('pending'),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  acceptedAt: integer('accepted_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export type TenantInvitation = typeof tenantInvitations.$inferSelect
export type NewTenantInvitation = typeof tenantInvitations.$inferInsert

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled'

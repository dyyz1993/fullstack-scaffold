import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { tenants } from './tenants'
import { tenantRoles } from './tenant-roles'

/**
 * 租户邀请（email + 一次性 token，默认 7 天过期）。
 * token 随邀请链接分发：/invite/:token 前端页凭 token 查详情并接受。
 */
export const tenantInvitations = sqliteTable('tenant_invitations', {
  id: text('id').primaryKey(),
  tenantId: integer('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  roleId: text('role_id')
    .notNull()
    .references(() => tenantRoles.id, { onDelete: 'cascade' }),
  inviterId: text('inviter_id').notNull(),
  token: text('token').notNull().unique(),
  status: text('status', {
    enum: ['pending', 'accepted', 'declined', 'expired', 'cancelled'],
  })
    .notNull()
    .default('pending'),
  expiresAt: text('expires_at').notNull(),
  acceptedAt: text('accepted_at'),
  createdAt: text('created_at').notNull(),
})

export type TenantInvitationTable = typeof tenantInvitations.$inferSelect
export type NewTenantInvitation = typeof tenantInvitations.$inferInsert

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled'

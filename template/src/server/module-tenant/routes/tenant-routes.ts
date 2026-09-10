import { createRoute, z } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import * as tenantService from '../services/tenant-service'
import {
  TenantSchema,
  CreateTenantSchema,
  UpdateTenantSchema,
  TenantListResponseSchema,
  TenantQuerySchema,
  TenantIdResponseSchema,
} from '@shared/schemas'
import {
  TenantRoleSchema,
  TenantMemberSchema,
  TenantInvitationSchema,
  PublicInvitationSchema,
  StringIdResponseSchema,
  TenantArrayResponseSchema,
  TenantRoleArrayResponseSchema,
  TenantMemberArrayResponseSchema,
  CreateTenantRoleSchema,
  UpdateTenantRoleSchema,
  InviteMemberSchema,
  UpdateMemberRoleSchema,
  TenantPermission,
  type PublicInvitation,
} from '@shared/schemas'
import { successResponse, errorResponse, success } from '@server/utils/route-helpers'
import { NotFoundError, AuthorizationError } from '@server/utils/app-error'
import { authMiddleware, requireSuperAdminMiddleware } from '@server/middleware/auth'
import { Role } from '@shared/modules/permission'
import type { Context } from 'hono'

/**
 * 租户内权限门禁：超管 bypass；成员须持有对应 TenantPermission
 * （非成员直接 403——这就是"租户隔离"的路由层执行点）
 */
async function requireTenantPerm(c: Context, tenantId: number, perm: TenantPermission) {
  const user = c.get('authUser')
  if (user.role === Role.SUPER_ADMIN) return
  await tenantService.requireTenantMembership(user.id, tenantId)
  const ok = await tenantService.hasTenantPermission(user.id, tenantId, perm)
  if (!ok) throw AuthorizationError.permissionDenied(perm)
}

const listRoute = createRoute({
  method: 'get',
  path: '/tenants',
  tags: ['tenants'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware(), requireSuperAdminMiddleware()],
  request: {
    query: TenantQuerySchema,
  },
  responses: {
    200: successResponse(TenantListResponseSchema, 'List tenants'),
  },
})

const getRoute = createRoute({
  method: 'get',
  path: '/tenants/{id}',
  tags: ['tenants'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware(), requireSuperAdminMiddleware()],
  request: {
    params: z.object({ id: z.coerce.number().int().positive() }),
  },
  responses: {
    200: successResponse(TenantSchema, 'Get tenant by ID'),
    404: errorResponse('Tenant not found'),
  },
})

const getBySlugRoute = createRoute({
  method: 'get',
  path: '/tenants/slug/{slug}',
  tags: ['tenants'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  request: {
    params: z.object({ slug: z.string() }),
  },
  responses: {
    200: successResponse(TenantSchema, 'Get tenant by slug'),
    404: errorResponse('Tenant not found'),
  },
})

const createRouteDef = createRoute({
  method: 'post',
  path: '/tenants',
  tags: ['tenants'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware(), requireSuperAdminMiddleware()],
  request: {
    body: {
      content: { 'application/json': { schema: CreateTenantSchema } },
    },
  },
  responses: {
    201: successResponse(TenantSchema, 'Create a new tenant'),
    400: errorResponse('Invalid input or tenant slug already exists'),
  },
})

const updateRoute = createRoute({
  method: 'put',
  path: '/tenants/{id}',
  tags: ['tenants'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware(), requireSuperAdminMiddleware()],
  request: {
    params: z.object({ id: z.coerce.number().int().positive() }),
    body: {
      content: { 'application/json': { schema: UpdateTenantSchema } },
    },
  },
  responses: {
    200: successResponse(TenantSchema, 'Update a tenant'),
    404: errorResponse('Tenant not found'),
  },
})

const deleteRoute = createRoute({
  method: 'delete',
  path: '/tenants/{id}',
  tags: ['tenants'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware(), requireSuperAdminMiddleware()],
  request: {
    params: z.object({ id: z.coerce.number().int().positive() }),
  },
  responses: {
    200: successResponse(TenantIdResponseSchema, 'Delete a tenant'),
    404: errorResponse('Tenant not found'),
  },
})

const myTenantsRoute = createRoute({
  method: 'get',
  path: '/tenants/mine',
  tags: ['tenants'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  responses: {
    200: successResponse(TenantArrayResponseSchema, 'List tenants the current user belongs to'),
  },
})

const tenantRolesListRoute = createRoute({
  method: 'get',
  path: '/tenants/{tenantId}/roles',
  tags: ['tenants'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  request: {
    params: z.object({ tenantId: z.coerce.number().int().positive() }),
  },
  responses: {
    200: successResponse(TenantRoleArrayResponseSchema, 'List tenant roles'),
    403: errorResponse('Not a member of this tenant'),
  },
})

const tenantRoleCreateRoute = createRoute({
  method: 'post',
  path: '/tenants/{tenantId}/roles',
  tags: ['tenants'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  request: {
    params: z.object({ tenantId: z.coerce.number().int().positive() }),
    body: { content: { 'application/json': { schema: CreateTenantRoleSchema } } },
  },
  responses: {
    201: successResponse(TenantRoleSchema, 'Create a custom tenant role'),
    400: errorResponse('Invalid input or plan role limit reached'),
    403: errorResponse('No permission'),
  },
})

const tenantRoleUpdateRoute = createRoute({
  method: 'put',
  path: '/tenants/{tenantId}/roles/{roleId}',
  tags: ['tenants'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  request: {
    params: z.object({
      tenantId: z.coerce.number().int().positive(),
      roleId: z.string(),
    }),
    body: { content: { 'application/json': { schema: UpdateTenantRoleSchema } } },
  },
  responses: {
    200: successResponse(TenantRoleSchema, 'Update a tenant role'),
    403: errorResponse('No permission'),
    404: errorResponse('Role not found'),
  },
})

const tenantRoleDeleteRoute = createRoute({
  method: 'delete',
  path: '/tenants/{tenantId}/roles/{roleId}',
  tags: ['tenants'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  request: {
    params: z.object({
      tenantId: z.coerce.number().int().positive(),
      roleId: z.string(),
    }),
  },
  responses: {
    200: successResponse(StringIdResponseSchema, 'Soft-delete a tenant role'),
    400: errorResponse('System role cannot be deleted'),
    403: errorResponse('No permission'),
  },
})

const tenantMembersListRoute = createRoute({
  method: 'get',
  path: '/tenants/{tenantId}/members',
  tags: ['tenants'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  request: {
    params: z.object({ tenantId: z.coerce.number().int().positive() }),
  },
  responses: {
    200: successResponse(TenantMemberArrayResponseSchema, 'List tenant members with roles'),
    403: errorResponse('Not a member of this tenant'),
  },
})

const memberInviteRoute = createRoute({
  method: 'post',
  path: '/tenants/{tenantId}/members/invite',
  tags: ['tenants'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  request: {
    params: z.object({ tenantId: z.coerce.number().int().positive() }),
    body: { content: { 'application/json': { schema: InviteMemberSchema } } },
  },
  responses: {
    201: successResponse(TenantInvitationSchema, 'Create an invitation (7-day token)'),
    400: errorResponse('Invalid input or role not in tenant'),
    403: errorResponse('No permission'),
  },
})

const memberUpdateRoute = createRoute({
  method: 'put',
  path: '/tenants/{tenantId}/members/{memberId}',
  tags: ['tenants'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  request: {
    params: z.object({
      tenantId: z.coerce.number().int().positive(),
      memberId: z.string(),
    }),
    body: { content: { 'application/json': { schema: UpdateMemberRoleSchema } } },
  },
  responses: {
    200: successResponse(TenantMemberSchema, 'Change member role'),
    403: errorResponse('No permission'),
    404: errorResponse('Member not found'),
  },
})

const memberRemoveRoute = createRoute({
  method: 'delete',
  path: '/tenants/{tenantId}/members/{memberId}',
  tags: ['tenants'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  request: {
    params: z.object({
      tenantId: z.coerce.number().int().positive(),
      memberId: z.string(),
    }),
  },
  responses: {
    200: successResponse(StringIdResponseSchema, 'Remove member (soft, status=left)'),
    403: errorResponse('No permission'),
    404: errorResponse('Member not found'),
  },
})

const invitationCancelRoute = createRoute({
  method: 'delete',
  path: '/tenants/{tenantId}/invitations/{invitationId}',
  tags: ['tenants'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  request: {
    params: z.object({
      tenantId: z.coerce.number().int().positive(),
      invitationId: z.string(),
    }),
  },
  responses: {
    200: successResponse(StringIdResponseSchema, 'Cancel invitation'),
    403: errorResponse('No permission'),
    404: errorResponse('Invitation not found'),
  },
})

const invitationDetailRoute = createRoute({
  method: 'get',
  path: '/tenants/invitations/{token}',
  tags: ['tenants'],
  summary: 'Get invitation detail (public, for the invite landing page)',
  request: {
    params: z.object({ token: z.string() }),
  },
  responses: {
    200: successResponse(PublicInvitationSchema, 'Invitation detail (sanitized)'),
    404: errorResponse('Invitation not found'),
  },
})

const invitationAcceptRoute = createRoute({
  method: 'post',
  path: '/tenants/invitations/{token}/accept',
  tags: ['tenants'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  request: {
    params: z.object({ token: z.string() }),
  },
  responses: {
    200: successResponse(TenantMemberSchema, 'Accept invitation and join tenant'),
    404: errorResponse('Invitation not found or expired'),
  },
})

const getCurrentTenantRoute = createRoute({
  method: 'get',
  path: '/tenant/current',
  tags: ['tenants'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  responses: {
    200: successResponse(TenantSchema, 'Get current tenant from context'),
    404: errorResponse('Tenant not found in context'),
  },
})

export const apiRoutes = new OpenAPIHono()
  .openapi(listRoute, async c => {
    const query = c.req.valid('query')

    const result = await tenantService.listTenants(query.page, query.pageSize, {
      status: query.status ?? undefined,
      plan: query.plan ?? undefined,
    })

    return c.json(success(result), 200)
  })
  .openapi(myTenantsRoute, async c => {
    const user = c.get('authUser')
    const tenantsForUser = await tenantService.getUserTenants(user.id)
    return c.json(success(tenantsForUser), 200)
  })
  .openapi(getRoute, async c => {
    const { id } = c.req.valid('param')
    const tenant = await tenantService.getTenantById(id)
    if (!tenant) throw new NotFoundError('Tenant', String(id))
    return c.json(success(tenant), 200)
  })
  .openapi(getBySlugRoute, async c => {
    const { slug } = c.req.valid('param')
    const tenant = await tenantService.getTenantBySlug(slug)
    if (!tenant) throw new NotFoundError('Tenant', slug)
    return c.json(success(tenant), 200)
  })
  .openapi(createRouteDef, async c => {
    const data = c.req.valid('json')
    const user = c.get('authUser')
    const tenant = await tenantService.createTenant(data, user.id)
    return c.json(success(tenant), 201)
  })
  .openapi(updateRoute, async c => {
    const { id } = c.req.valid('param')
    const data = c.req.valid('json')
    const tenant = await tenantService.updateTenant(id, data)
    if (!tenant) throw new NotFoundError('Tenant', String(id))
    return c.json(success(tenant), 200)
  })
  .openapi(deleteRoute, async c => {
    const { id } = c.req.valid('param')
    const result = await tenantService.deleteTenant(id)
    if (!result) throw new NotFoundError('Tenant', String(id))
    return c.json(success({ id }), 200)
  })
  .openapi(getCurrentTenantRoute, async c => {
    const tenant = c.get('tenant')
    if (!tenant) throw new NotFoundError('Tenant context')
    return c.json(success(tenant), 200)
  })
  // todos 模块已占用 /docs；tenant 的 OpenAPI 文档挂独立路径避免 shadow
  .openapi(tenantRolesListRoute, async c => {
    const { tenantId } = c.req.valid('param')
    await requireTenantPerm(c, tenantId, TenantPermission.ROLE_VIEW)
    const roles = await tenantService.getTenantRoles(tenantId)
    return c.json(success(roles), 200)
  })
  .openapi(tenantRoleCreateRoute, async c => {
    const { tenantId } = c.req.valid('param')
    await requireTenantPerm(c, tenantId, TenantPermission.ROLE_CREATE)
    const data = c.req.valid('json')
    const role = await tenantService.createTenantRole(tenantId, {
      code: data.code,
      name: data.code,
      label: data.label,
      description: data.description ?? null,
      permissions: data.permissions,
    })
    return c.json(success(role), 201)
  })
  .openapi(tenantRoleUpdateRoute, async c => {
    const { tenantId, roleId } = c.req.valid('param')
    await requireTenantPerm(c, tenantId, TenantPermission.ROLE_EDIT)
    // 目标角色必须属于本租户
    const roles = await tenantService.getTenantRoles(tenantId)
    if (!roles.some(r => r.id === roleId)) throw new NotFoundError('Role', roleId)
    const data = c.req.valid('json')
    const role = await tenantService.updateTenantRole(roleId, {
      label: data.label ?? undefined,
      description: data.description ?? undefined,
      permissions: data.permissions ?? undefined,
    })
    if (!role) throw new NotFoundError('Role', roleId)
    return c.json(success(role), 200)
  })
  .openapi(tenantRoleDeleteRoute, async c => {
    const { tenantId, roleId } = c.req.valid('param')
    await requireTenantPerm(c, tenantId, TenantPermission.ROLE_DELETE)
    const roles = await tenantService.getTenantRoles(tenantId)
    if (!roles.some(r => r.id === roleId)) throw new NotFoundError('Role', roleId)
    const result = await tenantService.deleteTenantRole(roleId)
    if (!result) throw new NotFoundError('Role', roleId)
    return c.json(success({ id: roleId }), 200)
  })
  .openapi(tenantMembersListRoute, async c => {
    const { tenantId } = c.req.valid('param')
    await requireTenantPerm(c, tenantId, TenantPermission.MEMBER_VIEW)
    const members = await tenantService.getTenantMembers(tenantId)
    return c.json(success(members), 200)
  })
  .openapi(memberInviteRoute, async c => {
    const { tenantId } = c.req.valid('param')
    await requireTenantPerm(c, tenantId, TenantPermission.MEMBER_INVITE)
    const user = c.get('authUser')
    const data = c.req.valid('json')
    const invitation = await tenantService.inviteMember(tenantId, data.email, data.roleId, user.id)
    return c.json(success(invitation), 201)
  })
  .openapi(memberUpdateRoute, async c => {
    const { tenantId, memberId } = c.req.valid('param')
    await requireTenantPerm(c, tenantId, TenantPermission.MEMBER_ROLE_ASSIGN)
    const data = c.req.valid('json')
    const member = await tenantService.updateMemberRole(tenantId, memberId, data.roleId)
    if (!member) throw new NotFoundError('Member', memberId)
    return c.json(success(member), 200)
  })
  .openapi(memberRemoveRoute, async c => {
    const { tenantId, memberId } = c.req.valid('param')
    await requireTenantPerm(c, tenantId, TenantPermission.MEMBER_REMOVE)
    const result = await tenantService.removeMember(tenantId, memberId)
    if (!result) throw new NotFoundError('Member', memberId)
    return c.json(success({ id: memberId }), 200)
  })
  .openapi(invitationCancelRoute, async c => {
    const { tenantId, invitationId } = c.req.valid('param')
    await requireTenantPerm(c, tenantId, TenantPermission.MEMBER_INVITE)
    const result = await tenantService.cancelInvitation(tenantId, invitationId)
    if (!result) throw new NotFoundError('Invitation', invitationId)
    return c.json(success({ id: invitationId }), 200)
  })
  .openapi(invitationDetailRoute, async c => {
    const { token } = c.req.valid('param')
    const detail = await tenantService.getInvitationByToken(token)
    if (!detail) throw new NotFoundError('Invitation', token)
    const payload: PublicInvitation = {
      tenantName: detail.tenantName,
      tenantSlug: detail.tenantSlug,
      email: detail.invitation.email,
      roleLabel: detail.roleLabel,
      status: detail.invitation.status,
      expiresAt: detail.invitation.expiresAt,
    }
    return c.json(success(payload), 200)
  })
  .openapi(invitationAcceptRoute, async c => {
    const { token } = c.req.valid('param')
    const user = c.get('authUser')
    const member = await tenantService.acceptInvitation(token, user.id)
    if (!member) throw new NotFoundError('Invitation (invalid, used or expired)', token)
    return c.json(success(member), 200)
  })
  .doc('/tenant/docs', {
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'Tenant Management API',
    },
  })

/** 模块级窄类型（深度 = 1 个模块）— 供 rpc-surface 门面使用，禁止再向上合并 */
export type TenantApiType = typeof apiRoutes

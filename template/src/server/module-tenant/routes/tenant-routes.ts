import { createRoute } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import { z } from '@hono/zod-openapi'
import { authMiddleware } from '../../middleware/auth'
import { tenantIsolationMiddleware } from '../../middleware/tenant-isolation'
import { tenantService } from '../services/tenant-service'
import { successResponse, errorResponse, success, created } from '../../utils/route-helpers'
import type { Context } from 'hono'

function requireTenantOwnership(c: Context, tenantId: string): Response | null {
  const bypass = c.get('tenantBypass')
  if (bypass) return null
  const userTenantId = c.get('tenantId')
  if (userTenantId !== tenantId) {
    return c.json({ success: false, error: 'Cross-tenant access denied' }, 403)
  }
  return null
}
import {
  TenantSchema,
  TenantRoleSchema,
  TenantMemberSchema,
  InvitationSchema,
  CreateTenantSchema,
  UpdateTenantSchema,
  CreateTenantRoleSchema,
  UpdateTenantRoleSchema,
  InviteMemberSchema,
  UpdateMemberSchema,
  TenantListSchema,
  TenantRoleListSchema,
  TenantMemberListSchema,
  SuccessSchema,
} from '@shared/modules/tenant/schemas'

const getTenantsRoute = createRoute({
  method: 'get',
  path: '/tenants',
  tags: ['tenants'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  responses: {
    200: successResponse(TenantListSchema, 'Get user tenants'),
    401: errorResponse('Unauthorized'),
  },
})

const createTenantRoute = createRoute({
  method: 'post',
  path: '/tenants',
  tags: ['tenants'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  request: {
    body: {
      content: { 'application/json': { schema: CreateTenantSchema } },
    },
  },
  responses: {
    201: successResponse(TenantSchema, 'Tenant created'),
    400: errorResponse('Invalid request'),
    409: errorResponse('Tenant slug already exists'),
    401: errorResponse('Unauthorized'),
  },
})

const getTenantRoute = createRoute({
  method: 'get',
  path: '/tenants/:tenantId',
  tags: ['tenants'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware(), tenantIsolationMiddleware],
  request: {
    params: z.object({ tenantId: z.string() }),
  },
  responses: {
    200: successResponse(TenantSchema, 'Get tenant'),
    401: errorResponse('Unauthorized'),
    404: errorResponse('Tenant not found'),
  },
})

const updateTenantRoute = createRoute({
  method: 'put',
  path: '/tenants/:tenantId',
  tags: ['tenants'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware(), tenantIsolationMiddleware],
  request: {
    params: z.object({ tenantId: z.string() }),
    body: {
      content: { 'application/json': { schema: UpdateTenantSchema } },
    },
  },
  responses: {
    200: successResponse(TenantSchema, 'Tenant updated'),
    400: errorResponse('Invalid request'),
    401: errorResponse('Unauthorized'),
    404: errorResponse('Tenant not found'),
  },
})

const deleteTenantRoute = createRoute({
  method: 'delete',
  path: '/tenants/:tenantId',
  tags: ['tenants'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware(), tenantIsolationMiddleware],
  request: {
    params: z.object({ tenantId: z.string() }),
  },
  responses: {
    200: successResponse(SuccessSchema, 'Tenant deleted'),
    401: errorResponse('Unauthorized'),
    404: errorResponse('Tenant not found'),
  },
})

const getTenantRolesRoute = createRoute({
  method: 'get',
  path: '/tenants/:tenantId/roles',
  tags: ['tenants'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware(), tenantIsolationMiddleware],
  request: {
    params: z.object({ tenantId: z.string() }),
  },
  responses: {
    200: successResponse(TenantRoleListSchema, 'Get tenant roles'),
    401: errorResponse('Unauthorized'),
  },
})

const createTenantRoleRoute = createRoute({
  method: 'post',
  path: '/tenants/:tenantId/roles',
  tags: ['tenants'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware(), tenantIsolationMiddleware],
  request: {
    params: z.object({ tenantId: z.string() }),
    body: {
      content: { 'application/json': { schema: CreateTenantRoleSchema } },
    },
  },
  responses: {
    201: successResponse(TenantRoleSchema, 'Tenant role created'),
    400: errorResponse('Invalid request or role limit reached'),
    401: errorResponse('Unauthorized'),
  },
})

const updateTenantRoleRoute = createRoute({
  method: 'put',
  path: '/tenants/:tenantId/roles/:roleId',
  tags: ['tenants'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware(), tenantIsolationMiddleware],
  request: {
    params: z.object({ tenantId: z.string(), roleId: z.string() }),
    body: {
      content: { 'application/json': { schema: UpdateTenantRoleSchema } },
    },
  },
  responses: {
    200: successResponse(TenantRoleSchema, 'Tenant role updated'),
    400: errorResponse('Invalid request'),
    401: errorResponse('Unauthorized'),
    404: errorResponse('Role not found'),
  },
})

const deleteTenantRoleRoute = createRoute({
  method: 'delete',
  path: '/tenants/:tenantId/roles/:roleId',
  tags: ['tenants'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware(), tenantIsolationMiddleware],
  request: {
    params: z.object({ tenantId: z.string(), roleId: z.string() }),
  },
  responses: {
    200: successResponse(SuccessSchema, 'Tenant role deleted'),
    400: errorResponse('Cannot delete system role'),
    401: errorResponse('Unauthorized'),
  },
})

const getTenantMembersRoute = createRoute({
  method: 'get',
  path: '/tenants/:tenantId/members',
  tags: ['tenants'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware(), tenantIsolationMiddleware],
  request: {
    params: z.object({ tenantId: z.string() }),
  },
  responses: {
    200: successResponse(TenantMemberListSchema, 'Get tenant members'),
    401: errorResponse('Unauthorized'),
  },
})

const inviteMemberRoute = createRoute({
  method: 'post',
  path: '/tenants/:tenantId/members/invite',
  tags: ['tenants'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware(), tenantIsolationMiddleware],
  request: {
    params: z.object({ tenantId: z.string() }),
    body: {
      content: { 'application/json': { schema: InviteMemberSchema } },
    },
  },
  responses: {
    201: successResponse(InvitationSchema, 'Invitation sent'),
    400: errorResponse('Invalid request'),
    401: errorResponse('Unauthorized'),
  },
})

const updateMemberRoute = createRoute({
  method: 'put',
  path: '/tenants/:tenantId/members/:memberId',
  tags: ['tenants'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware(), tenantIsolationMiddleware],
  request: {
    params: z.object({ tenantId: z.string(), memberId: z.string() }),
    body: {
      content: { 'application/json': { schema: UpdateMemberSchema } },
    },
  },
  responses: {
    200: successResponse(TenantMemberSchema, 'Member updated'),
    400: errorResponse('Invalid request'),
    401: errorResponse('Unauthorized'),
    404: errorResponse('Member not found'),
  },
})

const removeMemberRoute = createRoute({
  method: 'delete',
  path: '/tenants/:tenantId/members/:memberId',
  tags: ['tenants'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware(), tenantIsolationMiddleware],
  request: {
    params: z.object({ tenantId: z.string(), memberId: z.string() }),
  },
  responses: {
    200: successResponse(SuccessSchema, 'Member removed'),
    401: errorResponse('Unauthorized'),
    404: errorResponse('Member not found'),
  },
})

const acceptInvitationRoute = createRoute({
  method: 'post',
  path: '/tenants/invitations/:token/accept',
  tags: ['tenants'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  request: {
    params: z.object({ token: z.string() }),
  },
  responses: {
    200: successResponse(TenantMemberSchema, 'Invitation accepted'),
    400: errorResponse('Invalid or expired invitation'),
    401: errorResponse('Unauthorized'),
  },
})

const getInvitationRoute = createRoute({
  method: 'get',
  path: '/tenants/invitations/:token',
  tags: ['tenants'],
  request: {
    params: z.object({ token: z.string() }),
  },
  responses: {
    200: successResponse(InvitationSchema, 'Get invitation'),
    404: errorResponse('Invitation not found'),
  },
})

export const tenantRoutes = new OpenAPIHono()
  .openapi(getTenantsRoute, async c => {
    const user = c.get('authUser')
    const tenants = await tenantService.getUserTenants(user.id)
    return c.json(success({ tenants }), 200)
  })
  .openapi(createTenantRoute, async c => {
    const user = c.get('authUser')
    const data = c.req.valid('json')

    const existing = await tenantService.getTenantBySlug(data.slug)
    if (existing) {
      return c.json({ success: false, error: '租户标识已存在' }, 409)
    }

    const tenant = await tenantService.createTenant({
      name: data.name,
      slug: data.slug,
      plan: data.plan ?? undefined,
      ownerId: user.id,
    })

    return c.json(created(tenant), 201)
  })
  .openapi(getTenantRoute, async c => {
    const { tenantId } = c.req.valid('param')
    const denied = requireTenantOwnership(c, tenantId)
    if (denied) return denied

    const tenant = await tenantService.getTenantById(tenantId)

    if (!tenant) {
      return c.json({ success: false, error: '租户不存在' }, 404)
    }

    return c.json(success(tenant), 200)
  })
  .openapi(updateTenantRoute, async c => {
    const { tenantId } = c.req.valid('param')
    const denied = requireTenantOwnership(c, tenantId)
    if (denied) return denied

    const data = c.req.valid('json')

    const updateData: Record<string, unknown> = {}
    if (data.name !== null && data.name !== undefined) updateData.name = data.name
    if (data.logo !== null && data.logo !== undefined) updateData.logo = data.logo
    if (data.description !== null && data.description !== undefined)
      updateData.description = data.description
    if (data.settings !== null && data.settings !== undefined) updateData.settings = data.settings

    const tenant = await tenantService.updateTenant(tenantId, updateData)
    if (!tenant) {
      return c.json({ success: false, error: '租户不存在' }, 404)
    }

    return c.json(success(tenant), 200)
  })
  .openapi(deleteTenantRoute, async c => {
    const { tenantId } = c.req.valid('param')
    const denied = requireTenantOwnership(c, tenantId)
    if (denied) return denied

    await tenantService.deleteTenant(tenantId)
    return c.json(success({ success: true }), 200)
  })
  .openapi(getTenantRolesRoute, async c => {
    const { tenantId } = c.req.valid('param')
    const denied = requireTenantOwnership(c, tenantId)
    if (denied) return denied

    const roles = await tenantService.getTenantRoles(tenantId)
    return c.json(success({ roles }), 200)
  })
  .openapi(createTenantRoleRoute, async c => {
    const { tenantId } = c.req.valid('param')
    const denied = requireTenantOwnership(c, tenantId)
    if (denied) return denied

    const data = c.req.valid('json')

    try {
      const role = await tenantService.createTenantRole(tenantId, {
        code: data.code,
        name: data.name,
        label: data.label,
        description: data.description ?? undefined,
        permissions: JSON.stringify(data.permissions),
        isActive: true,
        isSystem: false,
        sortOrder: 0,
      })
      return c.json(created(role), 201)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return c.json({ success: false, error: message }, 400)
    }
  })
  .openapi(updateTenantRoleRoute, async c => {
    const { tenantId, roleId } = c.req.valid('param')
    const denied = requireTenantOwnership(c, tenantId)
    if (denied) return denied

    const data = c.req.valid('json')

    const updateData: Record<string, unknown> = {}
    if (data.name !== null && data.name !== undefined) updateData.name = data.name
    if (data.label !== null && data.label !== undefined) updateData.label = data.label
    if (data.description !== null && data.description !== undefined)
      updateData.description = data.description
    if (data.permissions) updateData.permissions = JSON.stringify(data.permissions)

    const role = await tenantService.updateTenantRole(roleId, updateData)
    if (!role) {
      return c.json({ success: false, error: '角色不存在' }, 404)
    }

    return c.json(success(role), 200)
  })
  .openapi(deleteTenantRoleRoute, async c => {
    const { tenantId, roleId } = c.req.valid('param')
    const denied = requireTenantOwnership(c, tenantId)
    if (denied) return denied

    const deleted = await tenantService.deleteTenantRole(roleId)

    if (!deleted) {
      return c.json({ success: false, error: '无法删除系统角色' }, 400)
    }

    return c.json(success({ success: true }), 200)
  })
  .openapi(getTenantMembersRoute, async c => {
    const { tenantId } = c.req.valid('param')
    const denied = requireTenantOwnership(c, tenantId)
    if (denied) return denied

    const members = await tenantService.getTenantMembers(tenantId)
    return c.json(success({ members }), 200)
  })
  .openapi(inviteMemberRoute, async c => {
    const { tenantId } = c.req.valid('param')
    const denied = requireTenantOwnership(c, tenantId)
    if (denied) return denied

    const user = c.get('authUser')
    const data = c.req.valid('json')

    const invitation = await tenantService.inviteMember(tenantId, data.email, data.roleId, user.id)

    return c.json(created(invitation), 201)
  })
  .openapi(updateMemberRoute, async c => {
    const { tenantId, memberId } = c.req.valid('param')
    const denied = requireTenantOwnership(c, tenantId)
    if (denied) return denied

    const data = c.req.valid('json')

    const member = await tenantService.updateMemberRole(memberId, data.roleId)
    if (!member) {
      return c.json({ success: false, error: '成员不存在' }, 404)
    }

    return c.json(success(member), 200)
  })
  .openapi(removeMemberRoute, async c => {
    const { tenantId, memberId } = c.req.valid('param')
    const denied = requireTenantOwnership(c, tenantId)
    if (denied) return denied

    await tenantService.removeMember(memberId)
    return c.json(success({ success: true }), 200)
  })
  .openapi(acceptInvitationRoute, async c => {
    const { token } = c.req.valid('param')
    const user = c.get('authUser')

    const member = await tenantService.acceptInvitation(token, user.id)

    if (!member) {
      return c.json({ success: false, error: '邀请无效或已过期' }, 400)
    }

    return c.json(success(member), 200)
  })
  .openapi(getInvitationRoute, async c => {
    const { token } = c.req.valid('param')
    const invitation = await tenantService.getInvitationByToken(token)

    if (!invitation) {
      return c.json({ success: false, error: '邀请不存在' }, 404)
    }

    return c.json(success(invitation), 200)
  })

import { createRoute } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import * as workspaceService from '../services/workspace-service'
import {
  WorkspaceSchema,
  UpdateWorkspaceSchema,
  DeleteWorkspaceResponseSchema,
} from '@shared/modules/workspace'
import { successResponse, errorResponse, success } from '@server/utils/route-helpers'
import { getAuthUser } from '../../utils/auth'
import { NotFoundError } from '@server/utils/app-error'

const getWorkspaceRoute = createRoute({
  method: 'get',
  path: '/workspace',
  tags: ['workspace'],
  responses: {
    200: successResponse(WorkspaceSchema, 'Get or create workspace for current user'),
    401: errorResponse('Unauthorized'),
    500: errorResponse('Internal server error'),
  },
})

const updateWorkspaceRoute = createRoute({
  method: 'put',
  path: '/workspace',
  tags: ['workspace'],
  request: {
    body: {
      content: { 'application/json': { schema: UpdateWorkspaceSchema } },
    },
  },
  responses: {
    200: successResponse(WorkspaceSchema, 'Update workspace'),
    401: errorResponse('Unauthorized'),
    404: errorResponse('Workspace not found'),
    500: errorResponse('Internal server error'),
  },
})

const deleteWorkspaceRoute = createRoute({
  method: 'delete',
  path: '/workspace',
  tags: ['workspace'],
  responses: {
    200: successResponse(DeleteWorkspaceResponseSchema, 'Delete workspace'),
    401: errorResponse('Unauthorized'),
    404: errorResponse('Workspace not found'),
    500: errorResponse('Internal server error'),
  },
})

export const workspaceRoutes = new OpenAPIHono()
  .openapi(getWorkspaceRoute, async c => {
    const user = getAuthUser(c)

    const workspace = await workspaceService.getOrCreateWorkspace(user.id)

    return c.json(success(workspace))
  })
  .openapi(updateWorkspaceRoute, async c => {
    const user = getAuthUser(c)

    const input = c.req.valid('json')

    const workspace = await workspaceService.updateWorkspace(user.id, input)
    if (!workspace) {
      throw new NotFoundError('Workspace not found')
    }

    return c.json(success(workspace))
  })
  .openapi(deleteWorkspaceRoute, async c => {
    const user = getAuthUser(c)

    await workspaceService.deleteWorkspace(user.id)

    return c.json(success({ success: true }))
  })

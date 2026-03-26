import { createRoute, z } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import * as fileService from '../services/file-service'
import { successResponse, errorResponse, success } from '@server/utils/route-helpers'
import { getAuthUser } from '../../utils/auth'
import type { AuthUser } from '@server/middleware/auth'
import { WorkspaceFilesSchema, FileContentSchema } from '@shared/modules/workspace/schemas'

const defaultUser: AuthUser = {
  id: '3',
  username: 'user1',
  email: 'user1@example.com',
  role: 'user' as AuthUser['role'],
  permissions: [],
}

const getFilesRoute = createRoute({
  method: 'get',
  path: '/workspace/files',
  tags: ['workspace'],
  responses: {
    200: successResponse(WorkspaceFilesSchema, 'Get workspace files'),
    401: errorResponse('Unauthorized'),
    500: errorResponse('Internal server error'),
  },
})

const getFileContentRoute = createRoute({
  method: 'get',
  path: '/workspace/files/:path',
  tags: ['workspace'],
  request: {
    params: z.object({
      path: z.string(),
    }),
  },
  responses: {
    200: successResponse(FileContentSchema, 'Get file content'),
    401: errorResponse('Unauthorized'),
    404: errorResponse('File not found'),
    500: errorResponse('Internal server error'),
  },
})

export const fileRoutes = new OpenAPIHono()
  .openapi(getFilesRoute, async c => {
    let user = getAuthUser(c)

    if (!user) {
      user = defaultUser
    }

    const files = await fileService.getWorkspaceFiles(user.id)

    return c.json(success(files))
  })
  .openapi(getFileContentRoute, async c => {
    let user = getAuthUser(c)

    if (!user) {
      user = defaultUser
    }

    const { path } = c.req.valid('param')

    try {
      const content = await fileService.getFileContent(user.id, path)
      if (content === null) {
        return c.json({ success: false, error: 'File not found' }, 404)
      }
      return c.json(success({ content }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return c.json({ success: false, error: message }, 500)
    }
  })

import { createRoute, z } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import * as fileService from '../services/file-service'
import { successResponse, errorResponse, success } from '@server/utils/route-helpers'
import { getAuthUser } from '../../utils/auth'
import { NotFoundError } from '@server/utils/app-error'
import { WorkspaceFilesSchema, FileContentSchema } from '@shared/modules/workspace/schemas'

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
  path: '/workspace/files/{path}',
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
    const user = getAuthUser(c)

    const files = await fileService.getWorkspaceFiles(user.id)

    return c.json(success(files))
  })
  .openapi(getFileContentRoute, async c => {
    const user = getAuthUser(c)

    const { path } = c.req.valid('param')

    const content = await fileService.getFileContent(user.id, path)
    if (content === null) {
      throw new NotFoundError('File not found')
    }

    return c.json(success({ content }))
  })

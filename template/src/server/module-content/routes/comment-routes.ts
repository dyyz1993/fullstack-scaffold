import { createRoute } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import * as commentService from '../services/comment-service'
import { successResponse, errorResponse, success, created } from '@server/utils/route-helpers'
import { NotFoundError } from '@server/utils/app-error'
import { authMiddleware } from '@server/middleware/auth'
import { getAuthUser } from '@server/utils/auth'
import {
  ContentSchema,
  ContentCommentListResponseSchema,
  CreateContentCommentSchema,
  ContentCommentSchema,
} from '@shared/modules/content'

// 评论列表公开可读（游客可看），发表评论需登录（无额外权限要求）
const listCommentsRoute = createRoute({
  method: 'get',
  path: '/contents/{id}/comments',
  tags: ['contents'],
  request: {
    params: ContentSchema.pick({ id: true }),
  },
  responses: {
    200: successResponse(ContentCommentListResponseSchema, 'List comments of a content'),
    404: errorResponse('Content not found'),
  },
})

const createCommentRoute = createRoute({
  method: 'post',
  path: '/contents/{id}/comments',
  tags: ['contents'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  request: {
    params: ContentSchema.pick({ id: true }),
    body: {
      content: {
        'application/json': {
          schema: CreateContentCommentSchema,
        },
      },
    },
  },
  responses: {
    201: successResponse(ContentCommentSchema, 'Create a comment'),
    404: errorResponse('Content not found'),
    400: errorResponse('Invalid input'),
  },
})

export const commentRoutes = new OpenAPIHono()
  .openapi(listCommentsRoute, async c => {
    const { id } = c.req.valid('param')
    const comments = await commentService.getComments(id)
    return c.json(success({ comments, total: comments.length }), 200)
  })
  .openapi(createCommentRoute, async c => {
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const user = getAuthUser(c)
    const result = await commentService.createComment(
      id,
      { userId: user.id, userName: user.username },
      body
    )
    if (!result) throw new NotFoundError('Content', id)
    return c.json(created(result), 201)
  })

/** 模块级窄类型（深度 = 1 个模块）— 供 rpc-surface 门面使用，禁止再向上合并 */
export type CommentsApiType = typeof commentRoutes

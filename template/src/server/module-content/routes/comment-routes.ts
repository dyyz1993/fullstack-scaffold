import { createRoute } from '@hono/zod-openapi'
import { OpenAPIHono, z } from '@hono/zod-openapi'
import * as commentService from '../services/comment-service'
import { successResponse, errorResponse, success, created } from '@server/utils/route-helpers'
import { NotFoundError, AuthorizationError } from '@server/utils/app-error'
import { authMiddleware } from '@server/middleware/auth'
import { getAuthUser } from '@server/utils/auth'
import { Role } from '@shared/modules/permission'
import {
  ContentSchema,
  ContentCommentListResponseSchema,
  ContentCommentListQuerySchema,
  ContentDeleteResultSchema,
  CreateContentCommentSchema,
  ContentCommentSchema,
} from '@shared/modules/content'

// 评论列表公开可读（游客可看），发表/删除评论需登录（无额外权限要求）
const listCommentsRoute = createRoute({
  method: 'get',
  path: '/contents/{id}/comments',
  tags: ['contents'],
  request: {
    params: ContentSchema.pick({ id: true }),
    query: ContentCommentListQuerySchema,
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

const deleteCommentRoute = createRoute({
  method: 'delete',
  path: '/contents/{id}/comments/{commentId}',
  tags: ['contents'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  request: {
    params: ContentSchema.pick({ id: true }).extend({ commentId: z.string() }),
  },
  responses: {
    200: successResponse(ContentDeleteResultSchema, 'Delete a comment'),
    403: errorResponse('Not allowed to delete this comment'),
    404: errorResponse('Comment not found'),
  },
})

export const commentRoutes = new OpenAPIHono()
  .openapi(listCommentsRoute, async c => {
    const { id } = c.req.valid('param')
    const query = c.req.valid('query')
    const result = await commentService.getComments(id, query)
    return c.json(success(result), 200)
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
  .openapi(deleteCommentRoute, async c => {
    const { id, commentId } = c.req.valid('param')
    const comment = await commentService.getComment(id, commentId)
    if (!comment) throw new NotFoundError('Comment', commentId)
    const user = getAuthUser(c)
    // 作者本人可删自己的；super_admin 恒放行（与 permission-service-impl 的
    // hasPermission 对 super_admin 语义一致），可删任何人的
    if (comment.userId !== user.id && user.role !== Role.SUPER_ADMIN) {
      throw new AuthorizationError('只能删除自己的评论')
    }
    await commentService.deleteComment(commentId)
    return c.json(success({ message: '评论已删除' }), 200)
  })

/** 模块级窄类型（深度 = 1 个模块）— 供 rpc-surface 门面使用，禁止再向上合并 */
export type CommentsApiType = typeof commentRoutes

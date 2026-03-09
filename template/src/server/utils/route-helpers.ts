import { z } from '@hono/zod-openapi'
import { ApiSuccessSchema, ApiErrorSchema } from '@shared/schemas'

/**
 * 创建成功响应配置
 */
export function successResponse<T extends z.ZodTypeAny>(schema: T, description: string) {
  return {
    content: {
      'application/json': { schema: ApiSuccessSchema(schema) },
    },
    description,
  }
}

/**
 * 创建错误响应配置
 */
export function errorResponse(description: string) {
  return {
    content: {
      'application/json': { schema: ApiErrorSchema },
    },
    description,
  }
}

/**
 * 创建列表响应配置
 */
export function listResponse<T extends z.ZodTypeAny>(itemSchema: T, description: string) {
  return successResponse(
    z.object({
      items: z.array(itemSchema),
      nextCursor: z.string().optional(),
    }),
    description
  )
}

/**
 * 创建删除响应配置
 */
export function deleteResponse(description = 'Deleted successfully') {
  return successResponse(z.object({ id: z.string() }), description)
}

/**
 * 创建 ID 参数配置
 */
export function idParam() {
  return z.object({ id: z.string() })
}

/**
 * 创建带 ID 参数的请求配置
 */
export function idRequest() {
  return {
    params: idParam(),
  }
}

/**
 * 创建带 body 的请求配置
 */
export function bodyRequest<T extends z.ZodTypeAny>(schema: T) {
  return {
    body: {
      content: { 'application/json': { schema } },
    },
  }
}

/**
 * 创建带 query 的请求配置
 */
export function queryRequest<T extends z.ZodObject<Record<string, z.ZodTypeAny>>>(schema: T) {
  return {
    query: schema,
  }
}

/**
 * 创建标准响应配置（成功 + 500 错误）
 */
export function standardResponses<T extends z.ZodTypeAny>(schema: T, description: string) {
  return {
    200: successResponse(schema, description),
    500: errorResponse('Internal server error'),
  }
}

/**
 * 创建带 404 的响应配置
 */
export function withNotFoundResponses<T extends z.ZodTypeAny>(
  schema: T,
  description: string,
  notFoundDescription = 'Not found'
) {
  return {
    200: successResponse(schema, description),
    404: errorResponse(notFoundDescription),
  }
}

/**
 * 创建创建资源的响应配置
 */
export function createResponses<T extends z.ZodTypeAny>(
  schema: T,
  description: string,
  badRequestDescription = 'Invalid input'
) {
  return {
    201: successResponse(schema, description),
    400: errorResponse(badRequestDescription),
  }
}

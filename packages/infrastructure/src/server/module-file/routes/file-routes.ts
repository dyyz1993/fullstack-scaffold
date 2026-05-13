import { createRoute, z } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import {
  getFilePath,
  readFileData,
  getFileInfo,
  verifySignature,
  getPublicFileUrl,
  getPrivateFileUrl,
  saveFile,
} from '@server/utils/file-storage'
import { mediumRateLimitMiddleware } from '@server/middleware/rate-limit'
import { successResponse, errorResponse, success } from '@server/utils/route-helpers'
import { NotFoundError, AuthorizationError } from '@server/utils/app-error'
import {
  FileDownloadSchema,
  PrivateFileQuerySchema,
  GenerateUrlRequestSchema,
  FileUrlResponseSchema,
  UploadResultSchema,
  UploadFileBodySchema,
} from '@shared/schemas'

const FileContentSchema = z.any()

const publicFileRoute = createRoute({
  method: 'get',
  path: '/public/{namespace}/{filename}',
  tags: ['files'],
  request: {
    params: FileDownloadSchema,
  },
  responses: {
    200: {
      description: 'File content',
      content: {
        'application/octet-stream': {
          schema: FileContentSchema,
        },
      },
    },
    404: errorResponse('File not found'),
  },
})

const privateFileRoute = createRoute({
  method: 'get',
  path: '/private/{namespace}/{filename}',
  tags: ['files'],
  request: {
    params: FileDownloadSchema,
    query: PrivateFileQuerySchema,
  },
  responses: {
    200: {
      description: 'File content',
      content: {
        'application/octet-stream': {
          schema: FileContentSchema,
        },
      },
    },
    403: errorResponse('Invalid or expired signature'),
    404: errorResponse('File not found'),
  },
})

const generateUrlRoute = createRoute({
  method: 'post',
  path: '/generate-url',
  tags: ['files'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: GenerateUrlRequestSchema,
        },
      },
    },
  },
  responses: {
    200: successResponse(FileUrlResponseSchema, 'URL generated successfully'),
    400: errorResponse('Invalid request'),
    404: errorResponse('File not found'),
  },
})

const checkFileRoute = createRoute({
  method: 'head',
  path: '/public/{namespace}/{filename}',
  tags: ['files'],
  request: {
    params: FileDownloadSchema,
  },
  responses: {
    200: {
      description: 'File exists',
      content: {
        'application/octet-stream': {
          schema: z.null(),
        },
      },
    },
    404: errorResponse('File not found'),
  },
})

const checkPrivateFileRoute = createRoute({
  method: 'head',
  path: '/private/{namespace}/{filename}',
  tags: ['files'],
  request: {
    params: FileDownloadSchema,
    query: PrivateFileQuerySchema,
  },
  responses: {
    200: {
      description: 'File exists',
      content: {
        'application/octet-stream': {
          schema: z.null(),
        },
      },
    },
    403: errorResponse('Invalid or expired signature'),
    404: errorResponse('File not found'),
  },
})

const uploadFileRoute = createRoute({
  method: 'post',
  path: '/upload',
  tags: ['files'],
  middleware: [mediumRateLimitMiddleware] as const,
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: UploadFileBodySchema,
        },
      },
    },
  },
  responses: {
    200: successResponse(UploadResultSchema, 'File uploaded successfully'),
    400: errorResponse('Invalid file or upload failed'),
  },
})

export const fileRoutes = new OpenAPIHono()
  .openapi(publicFileRoute, async c => {
    const { namespace, filename } = c.req.valid('param')

    const fileInfo = await getFileInfo(namespace, filename)
    if (!fileInfo) {
      throw new NotFoundError('File', `${namespace}/${filename}`)
    }

    const filePath = getFilePath(namespace, filename)
    const fileData = await readFileData(filePath)

    c.header('Content-Type', fileInfo.mimeType)
    c.header('Content-Length', fileInfo.size.toString())
    c.header('Content-Disposition', `inline; filename="${filename}"`)
    c.header('Cache-Control', 'public, max-age=31536000')
    c.header('Last-Modified', fileInfo.lastModified.toUTCString())

    return c.body(fileData as unknown as ReadableStream)
  })
  .openapi(privateFileRoute, async c => {
    const { namespace, filename } = c.req.valid('param')
    const { expiry, signature } = c.req.valid('query')

    const now = Math.floor(Date.now() / 1000)
    if (now > expiry) {
      throw new AuthorizationError('URL has expired')
    }

    if (!verifySignature(namespace, filename, expiry, signature)) {
      throw new AuthorizationError('Invalid signature')
    }

    const fileInfo = await getFileInfo(namespace, filename)
    if (!fileInfo) {
      throw new NotFoundError('File', `${namespace}/${filename}`)
    }

    const filePath = getFilePath(namespace, filename)
    const fileData = await readFileData(filePath)

    c.header('Content-Type', fileInfo.mimeType)
    c.header('Content-Length', fileInfo.size.toString())
    c.header('Content-Disposition', `inline; filename="${filename}"`)
    c.header('Cache-Control', 'private, no-store')

    return c.body(fileData as unknown as ReadableStream)
  })
  .openapi(generateUrlRoute, async c => {
    const { namespace, filename, isPrivate, expirySeconds } = c.req.valid('json')

    const fileInfo = await getFileInfo(namespace, filename)
    if (!fileInfo) {
      throw new NotFoundError('File', `${namespace}/${filename}`)
    }

    const baseUrl = process.env.PUBLIC_URL || ''

    if (isPrivate) {
      const { url, expiry } = getPrivateFileUrl(
        namespace,
        filename,
        expirySeconds ?? undefined,
        baseUrl
      )
      return c.json(success({ url, expiry }), 200)
    }

    const url = getPublicFileUrl(namespace, filename, baseUrl)
    return c.json(success({ url }), 200)
  })
  .openapi(checkFileRoute, async c => {
    const { namespace, filename } = c.req.valid('param')

    const fileInfo = await getFileInfo(namespace, filename)
    if (!fileInfo) {
      throw new NotFoundError('File', `${namespace}/${filename}`)
    }

    c.header('Content-Type', fileInfo.mimeType)
    c.header('Content-Length', fileInfo.size.toString())
    c.header('Last-Modified', fileInfo.lastModified.toUTCString())

    return c.body(null, 200)
  })
  .openapi(checkPrivateFileRoute, async c => {
    const { namespace, filename } = c.req.valid('param')
    const { expiry, signature } = c.req.valid('query')

    const now = Math.floor(Date.now() / 1000)
    if (now > expiry) {
      return c.json({ success: false as const, error: 'URL has expired' }, 403)
    }

    if (!verifySignature(namespace, filename, expiry, signature)) {
      return c.json({ success: false as const, error: 'Invalid signature' }, 403)
    }

    const fileInfo = await getFileInfo(namespace, filename)
    if (!fileInfo) {
      throw new NotFoundError('File', `${namespace}/${filename}`)
    }

    c.header('Content-Type', fileInfo.mimeType)
    c.header('Content-Length', fileInfo.size.toString())

    return c.body(null, 200)
  })
  .openapi(uploadFileRoute, async c => {
    const body = await c.req.parseBody()
    const file = body['file']

    if (!file || !(file instanceof File)) {
      return c.json({ success: false as const, error: 'No file provided' }, 400)
    }

    const namespace = typeof body['namespace'] === 'string' ? body['namespace'] : 'uploads'

    const arrayBuffer = await file.arrayBuffer()
    const uploaded = await saveFile(namespace, {
      name: file.name,
      type: file.type,
      size: file.size,
      data: arrayBuffer,
    })

    const url = getPublicFileUrl(namespace, uploaded.filename)

    return c.json(
      success({
        filename: uploaded.filename,
        originalName: uploaded.originalName,
        mimeType: uploaded.mimeType,
        size: uploaded.size,
        url,
      }),
      200
    )
  })

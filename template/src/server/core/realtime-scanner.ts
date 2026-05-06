/**
 * @framework-baseline 29531acf522cffdd
 *
 * 此文件属于框架层代码。如需修改，请添加以下说明：
 *
 * @framework-modify
 * @reason [必填] 修改原因
 * @impact [必填] 影响范围
 */

import { getRuntimeAdapter } from './runtime'

interface RouteContent {
  [mediaType: string]: {
    schema?: unknown
  }
}

interface RouteResponse {
  content?: RouteContent
}

interface OperationObject {
  responses?: {
    [statusCode: string]: RouteResponse
  }
}

interface PathItemObject {
  get?: OperationObject
  post?: OperationObject
  put?: OperationObject
  delete?: OperationObject
  patch?: OperationObject
}

interface OpenAPIDocument {
  paths?: Record<string, PathItemObject>
}

interface RealtimeScannable {
  getOpenAPIDocument(...args: unknown[]): unknown
}

export function autoRegisterRealtime(app: RealtimeScannable): void {
  let runtime
  try {
    runtime = getRuntimeAdapter()
  } catch {
    return
  }

  let doc: OpenAPIDocument
  try {
    doc = app.getOpenAPIDocument({
      openapi: '3.0.0',
      info: { title: 'API', version: '1.0.0' },
    }) as unknown as OpenAPIDocument
  } catch {
    return
  }

  const paths = doc.paths

  if (!paths) return

  const registeredPaths = new Set<string>()

  for (const [path, methods] of Object.entries(paths)) {
    if (!methods) continue

    const getOp = methods.get
    if (!getOp?.responses) continue

    const status200 = getOp.responses['200'] as RouteResponse | undefined
    const content = status200?.content

    if (!content) continue

    const hasWebSocket = 'websocket' in content
    const hasSSE = 'text/event-stream' in content

    if (hasWebSocket) {
      const fullPath = path.startsWith('/') ? path : `/${path}`
      if (!registeredPaths.has(fullPath)) {
        runtime.handleWS(fullPath)
        registeredPaths.add(fullPath)
      }
    }

    if (hasSSE) {
      const fullPath = path.startsWith('/') ? path : `/${path}`
      if (!registeredPaths.has(fullPath)) {
        runtime.handleSSE(fullPath)
        registeredPaths.add(fullPath)
      }
    }
  }
}

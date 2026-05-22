import type { ResolvedPreset } from './template-generator'
import { getStandaloneRoutes } from './route-registry'

export function generateServerApp(resolved: ResolvedPreset): string {
  const useRealtime = resolved.hasSSE || resolved.hasWebSocket
  const useAuditLog = resolved.hasPermission
  const useCaptcha = resolved.hasCaptcha
  const standaloneRoutes = getStandaloneRoutes(resolved)

  const imports: string[] = [
    `import { OpenAPIHono } from '@hono/zod-openapi'`,
    ``,
    `import { HTTPException } from 'hono/http-exception'`,
    `import type { ContentfulStatusCode } from 'hono/utils/http-status'`,
    `import { ZodError } from 'zod'`,
    `import type { AppBindings, CreateAppOptions } from './types/bindings'`,
    `import { AppError } from './utils/app-error'`,
    `import { autoRegisterRealtime } from './core/realtime-scanner'`,
    `import { corsMiddleware, loggerMiddleware, errorHandlerMiddleware } from './middleware'`,
  ]

  if (useRealtime) {
    imports.push(`import { realtimeEnvMiddleware } from './middleware/realtime-env'`)
  }
  if (useAuditLog) {
    imports.push(`import { auditLogMiddleware } from './middleware/audit-log'`)
  }
  if (useCaptcha) {
    imports.push(`import { captchaMiddleware } from './middleware/captcha'`)
  }

  imports.push(
    `import { createModuleLoggerSync } from './utils/logger'`,
    `import { adminApiRoutes, clientApiRoutes } from './route-registry'`
  )

  // Import standalone routes from their source modules (already imported via route-registry)
  // But standalone routes are NOT part of the aggregated clientApiRoutes/adminApiRoutes,
  // so we import them directly for mounting at their custom paths.
  const standaloneImportSet = new Set<string>()
  for (const [name, manifest] of resolved.modules) {
    if (manifest.routes.standalone) {
      const { importPath, exportName } = manifest.routes.standalone
      const moduleDir = `module-${name}`
      const relPath = importPath.replace(/^\.\//, '')
      // Check if this import is already in the route-registry (which re-exports aren't — we import directly)
      const stmt = `import { ${exportName} } from './${moduleDir}/${relPath}'`
      if (!standaloneImportSet.has(stmt)) {
        standaloneImportSet.add(stmt)
        imports.push(stmt)
      }
    }
  }

  const middlewareChain: string[] = [
    `.use('*', errorHandlerMiddleware())`,
    `.use('*', loggerMiddleware())`,
    `.use('*', corsMiddleware())`,
  ]

  if (useRealtime) {
    middlewareChain.push(`.use('*', realtimeEnvMiddleware())`)
  }
  if (useAuditLog) {
    middlewareChain.push(`.use('/api/*', auditLogMiddleware())`)
  }
  if (useCaptcha) {
    middlewareChain.push(
      `.use(\n      '/api/admin/*',\n      captchaMiddleware({\n        maxRequests: 20,\n        windowMs: 60000,\n      })\n    )`
    )
  }

  const routes: string[] = [`.route('/', clientApiRoutes)`, `.route('/', adminApiRoutes)`]

  // Dynamically mount standalone routes at their custom paths
  for (const sr of standaloneRoutes) {
    routes.push(`.route('${sr.mountPath}', ${sr.localName})`)
  }

  const indent = '    '
  const chain = [...middlewareChain, ...routes].join(`\n${indent}`)

  return `${imports.join('\n')}

export { type AppBindings, type CreateAppOptions } from './types/bindings'

export function createApp<T extends AppBindings = AppBindings>(_options: CreateAppOptions = {}) {
  const app = new OpenAPIHono<{ Bindings: T }>()
    ${chain}
    .get('/health', async c => {
      try {
        const { getDb } = await import('./db')
        await getDb()
        return c.json({ status: 'ok', timestamp: new Date().toISOString(), db: 'connected' })
      } catch {
        return c.json({ status: 'ok', timestamp: new Date().toISOString(), db: 'not configured' })
      }
    })
    .post('/api/__test__/cleanup', async c => {
      try {
        const { cleanupTestDatabase } = await import('./db/test-setup')
        await cleanupTestDatabase()
        return c.json({ success: true as const, message: 'Database cleaned up' })
      } catch (error) {
        console.error('Error during database cleanup:', error)
        return c.json({ success: false as const, message: 'Failed to cleanup database' }, 500)
      }
    })

  autoRegisterRealtime(app as unknown as Parameters<typeof autoRegisterRealtime>[0])

  app.onError((err, c) => {
    const log = createModuleLoggerSync('api')
    c.res.headers.set('Content-Type', 'application/json')

    if (AppError.isAppError(err)) {
      return c.json(
        {
          success: false as const,
          error: err.message,
          status: err.statusCode,
          details: err.details,
        },
        err.statusCode as ContentfulStatusCode
      )
    }

    if (err instanceof HTTPException) {
      return c.json(
        { success: false as const, error: err.message, status: err.status },
        err.status as ContentfulStatusCode
      )
    }

    if (err instanceof ZodError) {
      const details = err.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
      }))
      return c.json(
        { success: false as const, error: 'Validation failed', status: 400, details },
        400
      )
    }

    log.error({ err, path: c.req.path }, 'Unhandled error')
    return c.json(
      { success: false as const, error: err.message || 'Internal server error', status: 500 },
      500
    )
  })

  return app
}
export type AdminApiType = typeof adminApiRoutes
export type ClientApiType = typeof clientApiRoutes
export type AppType = ReturnType<typeof createApp>
`
}

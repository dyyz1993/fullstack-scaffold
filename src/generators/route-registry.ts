import type { ResolvedPreset } from './template-generator'

export function generateRouteRegistry(resolved: ResolvedPreset): string {
  const imports: string[] = [
    `import { OpenAPIHono } from '@hono/zod-openapi'`,
    `import { rateLimitMiddleware } from './middleware/rate-limit'`,
  ]

  const clientRoutes: string[] = []
  const adminRoutes: string[] = []

  const moduleEntries = [...resolved.modules.entries()]

  for (const [name, manifest] of moduleEntries) {
    const moduleDir = `module-${name}`

    if (manifest.routes.client) {
      const { importPath, exportName } = manifest.routes.client
      imports.push(
        `import { ${exportName} } from './${moduleDir}/${importPath.replace(/^\.\//, '')}'`
      )
      clientRoutes.push(`  .route('/api', ${exportName})`)
    }

    if (manifest.routes.admin) {
      for (const route of manifest.routes.admin) {
        const { importPath, exportName } = route
        imports.push(
          `import { ${exportName} } from './${moduleDir}/${importPath.replace(/^\.\//, '')}'`
        )
        adminRoutes.push(`  .route('/api', ${exportName})`)
      }
    }
  }

  let content = imports.join('\n') + '\n\n'

  content += `const apiRateLimit = rateLimitMiddleware({\n`
  content += `  windowMs: 60 * 1000,\n`
  content += `  max: 100,\n`
  content += `})\n\n`

  if (clientRoutes.length > 0) {
    content += `// client API routes\n`
    content += `export const clientApiRoutes = new OpenAPIHono()\n`
    content += `  .use('*', apiRateLimit)\n`
    content += clientRoutes.join('\n') + '\n\n'
  } else {
    content += `// No client modules selected\n`
    content += `export const clientApiRoutes = new OpenAPIHono()\n\n`
  }

  if (adminRoutes.length > 0) {
    content += `// admin API routes\n`
    content += `export const adminApiRoutes = new OpenAPIHono()\n`
    content += adminRoutes.join('\n') + '\n\n'
  } else {
    content += `// No admin modules selected\n`
    content += `export const adminApiRoutes = new OpenAPIHono()\n\n`
  }

  content += `export type ClientApiRoutes = typeof clientApiRoutes\n`
  content += `export type AdminApiRoutes = typeof adminApiRoutes\n`

  return content
}

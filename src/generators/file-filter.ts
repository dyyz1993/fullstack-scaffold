import type { ModuleManifest } from './template-generator'
import type { ResolvedPreset } from './template-generator'

export interface FileFilterRule {
  pattern: string
  action: 'include' | 'exclude'
  condition: string
}

export function getExcludePatterns(
  resolved: ResolvedPreset,
  allManifests: Map<string, ModuleManifest>
): string[] {
  const excludes: string[] = []

  for (const [name, manifest] of allManifests) {
    if (resolved.modules.has(name)) continue

    excludes.push(`src/server/module-${name}`)

    if (manifest.sharedSchemas) {
      excludes.push(`src/shared/modules/${manifest.sharedSchemas.path}`)
      if (manifest.sharedSchemas.additionalPaths) {
        for (const extra of manifest.sharedSchemas.additionalPaths) {
          excludes.push(`src/shared/modules/${extra}`)
        }
      }
    }

    if (manifest.dbSchemas) {
      for (const file of manifest.dbSchemas.files) {
        excludes.push(`src/server/db/schema/${file}.ts`)
      }
    }

    if (manifest.clientPages) {
      for (const page of manifest.clientPages) {
        excludes.push(`src/client/pages/${page.name}.tsx`)
      }
    }

    if (manifest.clientStores) {
      for (const store of manifest.clientStores) {
        excludes.push(`src/client/stores/${store}.ts`)
      }
    }

    if (manifest.adminPages) {
      for (const page of manifest.adminPages) {
        excludes.push(`src/admin/pages/${page.name}.tsx`)
      }
    }

    if (manifest.providesMiddleware) {
      for (const mw of manifest.providesMiddleware) {
        excludes.push(`src/server/middleware/${mw.name}.ts`)
      }
    }

    if (name === 'notifications') {
      excludes.push('src/cli/modules/notification')
      excludes.push('src/client/pages/__tests__/NotificationPage.test.tsx')
    }
    if (name === 'chat') {
      excludes.push('src/client/pages/__tests__/WebSocketPage.test.tsx')
    }
  }

  if (!resolved.hasAdmin) {
    excludes.push('src/client/components/AuthButton.tsx')
    excludes.push('src/admin')
    excludes.push('admin.html')
    excludes.push('auth-inject.html')
    excludes.push('src/client/components/__tests__/AuthButton.test.tsx')
  }

  if (!resolved.hasPermission) {
    excludes.push('src/server/utils/permission-utils.ts')
    excludes.push('src/server/middleware/__tests__/auth-simple.test.ts')
    excludes.push('src/server/middleware/__tests__/auth.test.ts')
    excludes.push('src/server/middleware/__tests__/error-response-format.test.ts')
  }

  return excludes
}

export function getGeneratedFiles(resolved: ResolvedPreset): string[] {
  const files: string[] = [
    'src/server/route-registry.ts',
    'src/server/db/schema/index.ts',
    'src/client/App.tsx',
    'src/client/components/Navigation.tsx',
    'src/shared/modules/index.ts',
    'src/shared/schemas/index.ts',
    'src/server/middleware/index.ts',
    'src/client/components/index.ts',
    'src/cli/modules/index.ts',
  ]

  if (resolved.hasAdmin) {
    files.push('src/admin/App.tsx')
  }

  if (!resolved.hasPermission) {
    files.push('src/server/middleware/auth.ts')
    files.push('src/server/utils/auth.ts')
  }

  files.push('src/server/app.ts')

  if (!resolved.hasAdmin) {
    files.push('vite.config.ts')
  }

  const seedModules = ['order', 'ticket', 'dispute', 'content']
  if (seedModules.some(m => !resolved.modules.has(m)) || !resolved.hasPermission) {
    files.push('src/server/db/init.ts')
  }

  return files
}

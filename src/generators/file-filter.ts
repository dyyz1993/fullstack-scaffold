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
        excludes.push(`src/client/pages/__tests__/${page.name}.test.tsx`)
      }
    }

    if (manifest.clientStores) {
      for (const store of manifest.clientStores) {
        excludes.push(`src/client/stores/${store}.ts`)
        excludes.push(`src/client/stores/__tests__/${store}.test.ts`)
      }
    }

    if (manifest.adminPages) {
      for (const page of manifest.adminPages) {
        excludes.push(`src/admin/pages/${page.name}.tsx`)
        excludes.push(`src/admin/pages/__tests__/${page.name}.test.tsx`)
      }
    }

    if (manifest.providesMiddleware) {
      for (const mw of manifest.providesMiddleware) {
        excludes.push(`src/server/middleware/${mw.name}.ts`)
        excludes.push(`src/server/middleware/__tests__/${mw.name}.test.ts`)
      }
    }

    if (name === 'todos') {
      excludes.push('src/server/__tests__/integration/todos-api.test.ts')
    }

    // Exclude CLI module dir when the server module is not in the preset
    if (manifest.cliModule) {
      excludes.push(`src/cli/modules/${manifest.cliModule.dir}`)
    }
  }

  if (!resolved.modules.has('admin')) {
    excludes.push('src/admin')
    excludes.push('admin.html')
    excludes.push('auth-inject.html')
  }

  // tenant/merchant HTML entries only needed when tenant module is present (saas preset)
  if (!resolved.modules.has('tenant')) {
    excludes.push('src/tenant')
    excludes.push('tenant.html')
    excludes.push('src/merchant')
    excludes.push('merchant.html')
    excludes.push('src/server/middleware/tenant-isolation.ts')
    excludes.push('src/server/middleware/__tests__/tenant-isolation.test.ts')
  }

  if (!resolved.hasClient) {
    excludes.push('src/client')
    excludes.push('index.html')
    excludes.push('admin.html')
    excludes.push('auth-inject.html')
    excludes.push('src/admin')
    excludes.push('vite.config.ts')
    excludes.push('postcss.config.js')
    excludes.push('tailwind.config.js')
  }

  if (!resolved.hasClient) {
    excludes.push('src/client/components/AuthButton.tsx')
    excludes.push('src/client/components/__tests__/AuthButton.test.tsx')
  } else if (!resolved.modules.has('admin') && !resolved.modules.has('auth')) {
    excludes.push('src/client/components/AuthButton.tsx')
    excludes.push('src/client/components/__tests__/AuthButton.test.tsx')
    excludes.push('src/server/utils/auth.ts')
  }

  excludes.push('src/client/preset-ui-config.ts')

  // LoginPage/RegisterPage are excluded via the for loop above (auth clientPages)
  // when auth module is not in the preset

  if (!resolved.hasPermission && !resolved.modules.has('auth')) {
    excludes.push('src/server/utils/permission-utils.ts')
    excludes.push('src/server/utils/__tests__/permission-utils.test.ts')
    excludes.push('src/server/middleware/__tests__/auth-simple.test.ts')
    excludes.push('src/server/middleware/__tests__/auth.test.ts')
    excludes.push('src/server/middleware/__tests__/error-response-format.test.ts')
    excludes.push('src/server/utils/__tests__/auth.test.ts')
  } else if (!resolved.hasPermission && resolved.modules.has('auth')) {
    excludes.push('src/server/utils/permission-utils.ts')
    excludes.push('src/server/utils/__tests__/permission-utils.test.ts')
    excludes.push('src/server/middleware/__tests__/auth-simple.test.ts')
    excludes.push('src/server/middleware/__tests__/auth.test.ts')
    excludes.push('src/server/middleware/__tests__/error-response-format.test.ts')
    excludes.push('src/server/utils/__tests__/auth.test.ts')
    excludes.push('src/server/module-auth/__tests__/auth-service.test.ts')
  } else if (!resolved.modules.has('admin')) {
    excludes.push('src/server/middleware/__tests__/error-response-format.test.ts')
  }

  if (!resolved.modules.has('captcha')) {
    excludes.push('src/server/utils/__tests__/captcha.test.ts')
  }

  return excludes
}

export function getGeneratedFiles(resolved: ResolvedPreset): string[] {
  const files: string[] = [
    'src/server/route-registry.ts',
    'src/server/db/schema/index.ts',
    'src/shared/modules/index.ts',
    'src/shared/schemas/index.ts',
    'src/server/middleware/index.ts',
    'src/server/app.ts',
    'src/cli/modules/index.ts',
  ]

  if (resolved.hasClient) {
    files.push(
      'src/client/App.tsx',
      'src/client/components/Navigation.tsx',
      'src/client/components/index.ts',
      'src/client/Layout.tsx',
      'src/client/components/__tests__/App.test.tsx',
      'src/client/components/__tests__/Navigation.test.tsx',
      'src/client/main.tsx',
      'src/client/preset-ui-config.ts'
    )
  }

  if (resolved.hasClient && resolved.modules.has('admin')) {
    files.push('src/admin/App.tsx')
  }

  if (resolved.hasClient && !resolved.modules.has('admin')) {
    files.push('vite.config.ts')
  }

  if (resolved.hasClient && resolved.modules.has('admin')) {
    // admin preset needs generated vite.config.ts to filter tenant/merchant entries
    files.push('vite.config.ts')
  }

  if (!resolved.hasPermission) {
    files.push('src/server/middleware/auth.ts')
    files.push('src/server/utils/auth.ts')
  }

  if (!resolved.modules.has('admin') && resolved.hasPermission) {
    files.push('src/server/utils/auth.ts')
  }

  // Always generate init.ts — every preset has different seed combinations
  files.push('src/server/db/init.ts')

  return files
}

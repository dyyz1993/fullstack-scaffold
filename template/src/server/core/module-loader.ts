/**
 * @framework-baseline f51621ebf8da3453
 *
 * 此文件属于框架层代码。如需修改，请添加以下说明：
 *
 * @framework-modify
 * @reason [必填] 修改原因
 * @impact [必填] 影响范围
 */

/**
 * Module Loader — Phase 1 (validation only)
 *
 * Reads all module.ts manifests and validates consistency with the actual codebase.
 * This does NOT replace route-registry.ts — it's a safety check.
 *
 * Usage:
 *   npx tsx src/server/core/module-loader.ts          # validate all manifests
 *   npx tsx src/server/core/module-loader.ts --json    # output as JSON
 */

import { existsSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { ModuleManifest, ModuleRegistry } from '@shared/core/module-manifest'

// ---------------------------------------------------------------------------
// 1. Auto-discover all modules
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const SERVER_ROOT = resolve(__dirname, '..')
const SHARED_ROOT = resolve(SERVER_ROOT, '..', 'shared')
const DB_SCHEMA_DIR = join(SERVER_ROOT, 'db', 'schema')
const MODULES_DIR = SERVER_ROOT

function discoverModules(): string[] {
  const entries = readdirSync(MODULES_DIR)
  return entries.filter(
    e => e.startsWith('module-') && statSync(join(MODULES_DIR, e)).isDirectory()
  )
}

// ---------------------------------------------------------------------------
// 2. Load manifests dynamically
// ---------------------------------------------------------------------------

async function loadManifests(): Promise<ModuleRegistry> {
  const moduleDirs = discoverModules()
  const registry: ModuleRegistry = {}

  for (const dir of moduleDirs) {
    const manifestPath = join(MODULES_DIR, dir, 'module.ts')
    if (!existsSync(manifestPath)) {
      console.warn(`⚠️  No module.ts found in ${dir}`)
      continue
    }

    try {
      const mod = await import(pathToFileURL(manifestPath).href)
      const manifest: ModuleManifest = mod.default
      if (!manifest || !manifest.name) {
        console.error(`❌ Invalid manifest in ${dir}: missing name`)
        continue
      }
      registry[manifest.name] = manifest
    } catch (err) {
      console.error(`❌ Failed to load manifest from ${dir}:`, err)
    }
  }

  return registry
}

// ---------------------------------------------------------------------------
// 3. Validation functions
// ---------------------------------------------------------------------------

interface ValidationError {
  module: string
  type:
    | 'dependency'
    | 'route-file'
    | 'shared-schema'
    | 'db-schema'
    | 'circular-dep'
    | 'registry-mismatch'
  message: string
}

interface ValidationWarning {
  module: string
  type: 'unused-module' | 'missing-middleware' | 'missing-store'
  message: string
}

export async function validateModules(): Promise<{
  errors: ValidationError[]
  warnings: ValidationWarning[]
  registry: ModuleRegistry
}> {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  const registry = await loadManifests()
  const moduleNames = Object.keys(registry)

  // 3a. Validate dependencies exist
  for (const [name, manifest] of Object.entries(registry)) {
    for (const dep of manifest.dependsOn) {
      if (!moduleNames.includes(dep)) {
        errors.push({
          module: name,
          type: 'dependency',
          message: `depends on '${dep}' which is not a registered module`,
        })
      }
    }
  }

  // 3b. Check circular dependencies
  function hasCircular(name: string, visited: string[], path: string[]): boolean {
    if (visited.includes(name)) return false
    if (path.includes(name)) return true
    path.push(name)
    const manifest = registry[name]
    if (manifest) {
      for (const dep of manifest.dependsOn) {
        if (hasCircular(dep, visited, path)) return true
      }
    }
    path.pop()
    visited.push(name)
    return false
  }

  const circularChecked: string[] = []
  for (const name of moduleNames) {
    if (hasCircular(name, circularChecked, [])) {
      errors.push({
        module: name,
        type: 'circular-dep',
        message: `circular dependency detected`,
      })
    }
  }

  // 3c. Resolve each manifest to its actual directory
  const manifestDirs = new Map<string, string>()
  for (const dir of discoverModules()) {
    const manifestPath = join(MODULES_DIR, dir, 'module.ts')
    if (!existsSync(manifestPath)) continue
    try {
      const mod = await import(pathToFileURL(manifestPath).href)
      if (mod.default?.name) {
        manifestDirs.set(mod.default.name, dir)
      }
    } catch {
      // already logged in loadManifests
    }
  }

  // 3d. Validate route files exist
  for (const [name, manifest] of Object.entries(registry)) {
    const actualDir = manifestDirs.get(name)
    if (!actualDir) continue

    const modulePath = join(MODULES_DIR, actualDir)

    if (manifest.routes.client) {
      const clientRoutes = Array.isArray(manifest.routes.client)
        ? manifest.routes.client
        : manifest.routes.client
        ? [manifest.routes.client]
        : []
      for (const route of clientRoutes) {
        const filePath = resolve(modulePath, route.importPath + '.ts')
        if (!existsSync(filePath)) {
          errors.push({
            module: name,
            type: 'route-file',
            message: `client route file not found: ${route.importPath}.ts`,
          })
        }
      }
    }

    if (manifest.routes.admin) {
      for (const route of manifest.routes.admin) {
        const filePath = resolve(modulePath, route.importPath + '.ts')
        if (!existsSync(filePath)) {
          errors.push({
            module: name,
            type: 'route-file',
            message: `admin route file not found: ${route.importPath}.ts`,
          })
        }
      }
    }

    if (manifest.routes.standalone) {
      const filePath = resolve(modulePath, manifest.routes.standalone.importPath + '.ts')
      if (!existsSync(filePath)) {
        errors.push({
          module: name,
          type: 'route-file',
          message: `standalone route file not found: ${manifest.routes.standalone.importPath}.ts`,
        })
      }
    }

    // 3e. Validate shared schemas
    if (manifest.sharedSchemas) {
      const schemaDir = join(SHARED_ROOT, 'modules', manifest.sharedSchemas.path)
      if (!existsSync(schemaDir)) {
        errors.push({
          module: name,
          type: 'shared-schema',
          message: `shared schema directory not found: shared/modules/${manifest.sharedSchemas.path}`,
        })
      }
    }

    // 3f. Validate DB schemas
    if (manifest.dbSchemas) {
      for (const file of manifest.dbSchemas.files) {
        const filePath = join(DB_SCHEMA_DIR, `${file}.ts`)
        if (!existsSync(filePath)) {
          errors.push({
            module: name,
            type: 'db-schema',
            message: `DB schema file not found: db/schema/${file}.ts`,
          })
        }
      }
    }
  }

  return { errors, warnings, registry }
}

// ---------------------------------------------------------------------------
// 4. CLI entry point
// ---------------------------------------------------------------------------

async function main() {
  const isJson = process.argv.includes('--json')

  console.error('🔍 Validating module manifests...\n')

  const { errors, warnings, registry } = await validateModules()
  const moduleNames = Object.keys(registry)

  if (isJson) {
    console.error(JSON.stringify({ errors, warnings, modules: moduleNames, registry }, null, 2))
    process.exit(errors.length > 0 ? 1 : 0)
  }

  // Pretty output
  console.error(`📋 Found ${moduleNames.length} modules:\n`)
  for (const [name, manifest] of Object.entries(registry)) {
    const deps =
      manifest.dependsOn.length > 0
        ? ` → depends on: ${manifest.dependsOn.join(', ')}`
        : ' (standalone)'
    console.error(`  ✓ ${name}${deps}`)
  }

  if (warnings.length > 0) {
    console.error(`\n⚠️  ${warnings.length} warnings:`)
    for (const w of warnings) {
      console.error(`  ⚠ [${w.module}] ${w.message}`)
    }
  }

  if (errors.length > 0) {
    console.error(`\n❌ ${errors.length} errors:`)
    for (const e of errors) {
      console.error(`  ✗ [${e.module}] (${e.type}) ${e.message}`)
    }
    process.exit(1)
  }

  console.error('\n✅ All module manifests are valid!')
}

main().catch(console.error)

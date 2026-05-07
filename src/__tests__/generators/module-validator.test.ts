import { describe, it, expect, beforeAll } from 'vitest'
import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadManifests } from '../../generators/template-generator'
import { existsSync, readFileSync } from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEMPLATE_DIR = path.join(__dirname, '../../../template')

describe('module drift detection', () => {
  let manifests: Map<string, any>

  beforeAll(async () => {
    manifests = await loadManifests(TEMPLATE_DIR)
  })

  describe('route exports match manifest', () => {
    it('every declared route exportName should exist in the route file', () => {
      const errors: string[] = []

      for (const [name, manifest] of manifests) {
        const moduleDir = `module-${name}`

        if (manifest.routes.client) {
          const { importPath, exportName } = manifest.routes.client
          const filePath = path.join(
            TEMPLATE_DIR,
            'src/server',
            moduleDir,
            importPath.replace(/^\.\//, '') + '.ts'
          )
          if (existsSync(filePath)) {
            const content = readFileSync(filePath, 'utf-8')
            if (!content.includes('export') || !content.includes(exportName)) {
              errors.push(`${name}: client route export '${exportName}' not found in ${importPath}`)
            }
          }
        }

        if (manifest.routes.admin) {
          for (const route of manifest.routes.admin) {
            const filePath = path.join(
              TEMPLATE_DIR,
              'src/server',
              moduleDir,
              route.importPath.replace(/^\.\//, '') + '.ts'
            )
            if (existsSync(filePath)) {
              const content = readFileSync(filePath, 'utf-8')
              if (!content.includes('export') || !content.includes(route.exportName)) {
                errors.push(
                  `${name}: admin route export '${route.exportName}' not found in ${route.importPath}`
                )
              }
            }
          }
        }
      }

      expect(errors).toEqual([])
    })
  })

  describe('route files exist', () => {
    it('every declared route importPath should resolve to a file', () => {
      const errors: string[] = []

      for (const [name, manifest] of manifests) {
        const moduleDir = `module-${name}`

        if (manifest.routes.client) {
          const filePath = path.join(
            TEMPLATE_DIR,
            'src/server',
            moduleDir,
            manifest.routes.client.importPath.replace(/^\.\//, '') + '.ts'
          )
          if (!existsSync(filePath)) {
            errors.push(
              `${name}: client route file not found: ${manifest.routes.client.importPath}.ts`
            )
          }
        }

        if (manifest.routes.admin) {
          for (const route of manifest.routes.admin) {
            const filePath = path.join(
              TEMPLATE_DIR,
              'src/server',
              moduleDir,
              route.importPath.replace(/^\.\//, '') + '.ts'
            )
            if (!existsSync(filePath)) {
              errors.push(`${name}: admin route file not found: ${route.importPath}.ts`)
            }
          }
        }

        if (manifest.routes.standalone) {
          const filePath = path.join(
            TEMPLATE_DIR,
            'src/server',
            moduleDir,
            manifest.routes.standalone.importPath.replace(/^\.\//, '') + '.ts'
          )
          if (!existsSync(filePath)) {
            errors.push(
              `${name}: standalone route file not found: ${manifest.routes.standalone.importPath}.ts`
            )
          }
        }
      }

      expect(errors).toEqual([])
    })
  })

  describe('db schema files exist', () => {
    it('every declared dbSchemas.file should exist on disk', () => {
      const errors: string[] = []

      for (const [name, manifest] of manifests) {
        if (manifest.dbSchemas) {
          for (const file of manifest.dbSchemas.files) {
            const filePath = path.join(TEMPLATE_DIR, 'src/server/db/schema', `${file}.ts`)
            if (!existsSync(filePath)) {
              errors.push(`${name}: db schema file '${file}.ts' not found`)
            }
          }
        }
      }

      expect(errors).toEqual([])
    })
  })

  describe('shared schema directories exist', () => {
    it('every declared sharedSchemas.path should exist', () => {
      const errors: string[] = []

      for (const [name, manifest] of manifests) {
        if (manifest.sharedSchemas) {
          const dirPath = path.join(TEMPLATE_DIR, 'src/shared/modules', manifest.sharedSchemas.path)
          if (!existsSync(dirPath)) {
            errors.push(`${name}: shared schema dir '${manifest.sharedSchemas.path}' not found`)
          }
          if (manifest.sharedSchemas.additionalPaths) {
            for (const p of manifest.sharedSchemas.additionalPaths) {
              const additionalPath = path.join(TEMPLATE_DIR, 'src/shared/modules', p)
              if (!existsSync(additionalPath)) {
                errors.push(`${name}: additional shared path '${p}' not found`)
              }
            }
          }
        }
      }

      expect(errors).toEqual([])
    })
  })

  describe('client pages exist', () => {
    it('every declared clientPage should have a corresponding file', () => {
      const errors: string[] = []

      for (const [name, manifest] of manifests) {
        if (manifest.clientPages) {
          for (const page of manifest.clientPages) {
            const filePath = path.join(TEMPLATE_DIR, 'src/client/pages', `${page.name}.tsx`)
            if (!existsSync(filePath)) {
              errors.push(`${name}: client page '${page.name}.tsx' not found`)
            }
          }
        }
      }

      expect(errors).toEqual([])
    })
  })

  describe('admin pages exist', () => {
    it('every declared adminPage should have a corresponding file', () => {
      const errors: string[] = []

      for (const [name, manifest] of manifests) {
        if (manifest.adminPages) {
          for (const page of manifest.adminPages) {
            const filePath = path.join(TEMPLATE_DIR, 'src/admin/pages', `${page.name}.tsx`)
            if (!existsSync(filePath)) {
              errors.push(`${name}: admin page '${page.name}.tsx' not found`)
            }
          }
        }
      }

      expect(errors).toEqual([])
    })
  })

  describe('client stores exist', () => {
    it('every declared clientStore should have a corresponding file', () => {
      const errors: string[] = []

      for (const [name, manifest] of manifests) {
        if (manifest.clientStores) {
          for (const store of manifest.clientStores) {
            const filePath = path.join(TEMPLATE_DIR, 'src/client/stores', `${store}.ts`)
            if (!existsSync(filePath)) {
              errors.push(`${name}: client store '${store}.ts' not found`)
            }
          }
        }
      }

      expect(errors).toEqual([])
    })
  })

  describe('middleware files exist', () => {
    it('every declared providesMiddleware should have a file on disk', () => {
      const errors: string[] = []

      for (const [name, manifest] of manifests) {
        if (manifest.providesMiddleware) {
          for (const mw of manifest.providesMiddleware) {
            const filePath = path.join(TEMPLATE_DIR, 'src/server/middleware', `${mw.name}.ts`)
            if (!existsSync(filePath)) {
              errors.push(
                `${name}: middleware file 'src/server/middleware/${mw.name}.ts' not found`
              )
            }
          }
        }
      }

      expect(errors).toEqual([])
    })
  })

  describe('validate:modules script passes', () => {
    it('should exit with code 0', () => {
      const result = execSync('npx tsx src/server/core/module-loader.ts 2>&1', {
        cwd: TEMPLATE_DIR,
        encoding: 'utf-8',
      })
      expect(result).toContain('All module manifests are valid')
    })
  })
})

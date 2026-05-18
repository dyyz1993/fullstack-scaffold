/**
 * Module Public API 验证器
 *
 * 确保被其他模块依赖（dependsOn）的服务端模块都有 index.ts 公共 API barrel 文件。
 * 模块应通过干净的公共接口被消费，而非深层内部导入。
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

export interface ModulePublicApiConfig {
  serverDir: string
  checkDirs: string[]
}

export interface ModulePublicApiError {
  module: string
  dependedBy: string[]
  suggestion: string
}

interface ParsedManifest {
  name: string
  dependsOn: string[]
}

function parseManifest(filePath: string): ParsedManifest | null {
  const content = readFileSync(filePath, 'utf-8')

  const nameMatch = content.match(/name:\s*['"`]([^'"`]+)['"`]/)
  if (!nameMatch) return null

  const dependsOnMatch = content.match(/dependsOn:\s*\[([^\]]*)\]/)
  const dependsOn = dependsOnMatch
    ? [...dependsOnMatch[1].matchAll(/['"`]([^'"`]+)['"`]/g)].map(m => m[1])
    : []

  return { name: nameMatch[1], dependsOn }
}

export function validateModulePublicApi(
  config: ModulePublicApiConfig,
  rootPath: string
): ModulePublicApiError[] {
  const serverPath = join(rootPath, config.serverDir)
  if (!existsSync(serverPath)) return []

  const entries = readdirSync(serverPath, { withFileTypes: true })
  const moduleDirs = entries
    .filter(e => e.isDirectory() && e.name.startsWith('module-'))
    .map(e => e.name)

  const manifests = new Map<string, ParsedManifest>()
  for (const dir of moduleDirs) {
    const manifestPath = join(serverPath, dir, 'module.ts')
    if (!existsSync(manifestPath)) continue
    const parsed = parseManifest(manifestPath)
    if (parsed) manifests.set(parsed.name, parsed)
  }

  const dependedUpon = new Map<string, string[]>()
  for (const [moduleName, manifest] of manifests) {
    for (const dep of manifest.dependsOn) {
      const consumers = dependedUpon.get(dep) ?? []
      consumers.push(moduleName)
      dependedUpon.set(dep, consumers)
    }
  }

  const errors: ModulePublicApiError[] = []
  for (const [depName, consumers] of dependedUpon) {
    const barrelPath = join(serverPath, `module-${depName}`, 'index.ts')
    if (!existsSync(barrelPath)) {
      errors.push({
        module: depName,
        dependedBy: consumers,
        suggestion: `Create template/src/server/module-${depName}/index.ts to expose a clean public API for consumers: ${consumers.join(
          ', '
        )}`,
      })
    }
  }

  return errors
}

export function formatModulePublicApiErrors(errors: ModulePublicApiError[]): string {
  if (errors.length === 0) return ''

  let output = `❌ Found ${errors.length} module(s) missing public API barrel (index.ts):\n\n`

  for (const err of errors) {
    output += `  module-${err.module}\n`
    output += `    → Depended by: ${err.dependedBy.join(', ')}\n`
    output += `    → Fix: ${err.suggestion}\n\n`
  }

  output += '📋 Guidelines:\n'
  output += '  Every module listed in dependsOn should have an index.ts barrel file\n'
  output += '  that re-exports its public API (routes, services, types).\n'

  return output
}

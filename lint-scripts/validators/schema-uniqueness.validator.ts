import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, basename } from 'node:path'

export interface SchemaUniquenessConfig {
  modulesDir: string
  checkDirs: string[]
  ignoreDirs: string[]
}

export interface SchemaUniquenessError {
  exportName: string
  modules: string[]
  suggestion: string
}

const SCHEMA_EXPORT_RE = /export\s+(?:const|type|function)\s+([A-Z][A-Za-z0-9]*Schema)\b/g
const TYPE_EXPORT_RE = /export\s+type\s+([A-Z][A-Za-z0-9]*)\b/g
const RE_EXPORT_SCHEMA_RE = /\b([A-Z][A-Za-z0-9]*Schema)\b/g
const RE_EXPORT_TYPE_RE = /type\s+([A-Z][A-Za-z0-9]*)\b/g

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function extractExportsFromFile(filePath: string): Set<string> {
  const content = readFileSync(filePath, 'utf-8')
  const names = new Set<string>()

  let m: RegExpExecArray | null
  SCHEMA_EXPORT_RE.lastIndex = 0
  while ((m = SCHEMA_EXPORT_RE.exec(content)) !== null) {
    names.add(m[1])
  }

  TYPE_EXPORT_RE.lastIndex = 0
  while ((m = TYPE_EXPORT_RE.exec(content)) !== null) {
    if (!m[1].endsWith('Schema')) {
      names.add(m[1])
    }
  }

  return names
}

function extractReExportsFromFile(filePath: string): Set<string> {
  const content = readFileSync(filePath, 'utf-8')
  const names = new Set<string>()

  if (!/^export\s*\{/m.test(content) && !/^export\s+\*\s+from/m.test(content)) {
    return names
  }

  let m: RegExpExecArray | null
  RE_EXPORT_SCHEMA_RE.lastIndex = 0
  while ((m = RE_EXPORT_SCHEMA_RE.exec(content)) !== null) {
    names.add(m[1])
  }

  RE_EXPORT_TYPE_RE.lastIndex = 0
  while ((m = RE_EXPORT_TYPE_RE.exec(content)) !== null) {
    if (!m[1].endsWith('Schema')) {
      names.add(m[1])
    }
  }

  return names
}

export function validateSchemaUniqueness(
  config: SchemaUniquenessConfig,
  rootPath: string
): SchemaUniquenessError[] {
  const modulesPath = join(rootPath, config.modulesDir)

  if (!existsSync(modulesPath)) {
    return []
  }

  const exportMap = new Map<string, string[]>()

  const entries = readdirSync(modulesPath, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (config.ignoreDirs.includes(entry.name)) continue

    const moduleName = entry.name
    const moduleDir = join(modulesPath, entry.name)

    const schemasFile = join(moduleDir, 'schemas.ts')
    if (existsSync(schemasFile)) {
      const exports = extractExportsFromFile(schemasFile)
      for (const name of exports) {
        const existing = exportMap.get(name) || []
        if (!existing.includes(moduleName)) {
          existing.push(moduleName)
        }
        exportMap.set(name, existing)
      }
    }

    const indexFile = join(moduleDir, 'index.ts')
    if (existsSync(schemasFile) && existsSync(indexFile)) {
      const reExports = extractReExportsFromFile(indexFile)
      for (const name of reExports) {
        if (exportMap.has(name)) continue
        const existing = exportMap.get(name) || []
        if (!existing.includes(moduleName)) {
          existing.push(moduleName)
        }
        exportMap.set(name, existing)
      }
    }
  }

  const errors: SchemaUniquenessError[] = []
  for (const [exportName, modules] of exportMap) {
    if (modules.length >= 2) {
      const suggestions = modules.map(mod => `${capitalize(mod)}${exportName}`)
      errors.push({
        exportName,
        modules,
        suggestion: suggestions.join(' or '),
      })
    }
  }

  errors.sort((a, b) => a.exportName.localeCompare(b.exportName))
  return errors
}

export function formatSchemaUniquenessErrors(errors: SchemaUniquenessError[]): string {
  if (errors.length === 0) return ''

  let output = `❌ Found ${errors.length} cross-module schema naming collision(s):\n\n`

  for (const err of errors) {
    output += `  "${err.exportName}" defined in: ${err.modules.join(', ')}\n`
    output += `    → Suggestion: rename to ${err.suggestion}\n\n`
  }

  output += '📋 Guidelines:\n'
  output += '  Each module should use unique schema names to avoid collisions\n'
  output += '  when unified via src/shared/schemas/index.ts.\n'
  output += '  Recommended pattern: {ModuleName}{SchemaName} (e.g. TodoSchema, OrderSchema)\n'

  return output
}

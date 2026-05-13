/**
 * Generates server/db/schema/index.ts barrel file based on resolved preset
 */
import type { ResolvedPreset } from './template-generator'
import { getDbSchemaFiles } from './template-generator'

export function generateDbSchemaBarrel(resolved: ResolvedPreset): string {
  const files = getDbSchemaFiles(resolved)

  const exports = files.map(f => `export * from './${f}'`)

  return exports.join('\n') + '\n'
}

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ResolvedPreset } from './template-generator'

export function generateViteConfig(resolved: ResolvedPreset, templateDir: string): string {
  const originalPath = join(templateDir, 'vite.config.ts')
  let content = readFileSync(originalPath, 'utf-8')

  // Build list of entries to remove based on missing modules
  const entriesToRemove: string[] = []
  const aliasesToRemove: string[] = []

  if (!resolved.modules.has('admin')) {
    entriesToRemove.push('admin')
    aliasesToRemove.push('@admin')
  }
  if (!resolved.modules.has('tenant')) {
    entriesToRemove.push('tenant', 'merchant')
    aliasesToRemove.push('@tenant', '@merchant')
  }

  // Remove rollupOptions input entries: "        name: path.resolve(__dirname, 'name.html'),"
  for (const name of entriesToRemove) {
    const re = new RegExp(
      `^\\s*${name}:\\s*path\\.resolve\\(__dirname,\\s*['"]${name}\\.html['"]\\),\\s*$\\n?`,
      'gm'
    )
    content = content.replace(re, '')
  }

  // Remove path aliases: "        '@name': path.resolve(__dirname, 'src/name'),"
  for (const alias of aliasesToRemove) {
    const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const dirName = alias.replace('@', '')
    const re = new RegExp(
      `^\\s*'${escapedAlias}':\\s*path\\.resolve\\(__dirname,\\s*['"]src\\/${dirName}['"]\\),\\s*$\\n?`,
      'gm'
    )
    content = content.replace(re, '')
  }

  return content
}

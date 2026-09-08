import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ResolvedPreset } from './template-generator'

export function generateViteConfig(resolved: ResolvedPreset, templateDir: string): string {
  const originalPath = join(templateDir, 'vite.config.ts')
  let content = readFileSync(originalPath, 'utf-8')

  const entriesToRemove: string[] = []
  const aliasesToRemove: string[] = []

  if (!resolved.modules.has('admin')) {
    entriesToRemove.push('admin')
    aliasesToRemove.push('@admin')
  }
  if (!resolved.modules.has('tenant')) {
    entriesToRemove.push('tenant')
    aliasesToRemove.push('@tenant')
  }
  if (!resolved.modules.has('merchant')) {
    entriesToRemove.push('merchant')
    aliasesToRemove.push('@merchant')
  }

  // antd is used by admin, tenant, and merchant pages — must match package-json.ts logic
  const hasAntdConsumer =
    resolved.modules.has('admin') ||
    resolved.modules.has('tenant') ||
    resolved.modules.has('merchant')

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

  // Remove antd-related chunks and warnings when no antd consumer exists
  if (!hasAntdConsumer) {
    const antdChunkRe = /^(\s*'vendor-antd':\s*\['antd',\s*'@ant-design\/icons'\],\s*\n)/gm
    content = content.replace(antdChunkRe, '')

    const onwarnRe =
      /^\s*\/\/ Suppress antd "use client" directive warnings[^\n]*\n\s*if \(warning\.code === 'MODULE_LEVEL_DIRECTIVE'\) return\n/gm
    content = content.replace(onwarnRe, '')
  }

  return content
}

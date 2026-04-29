/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

function findServerFiles(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (
      entry === '__tests__' ||
      entry === 'node_modules' ||
      entry === '.git' ||
      entry === 'test-utils'
    )
      continue
    if (statSync(full).isDirectory()) {
      findServerFiles(full, files)
    } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts') && entry !== 'logger.ts') {
      files.push(full)
    }
  }
  return files
}

describe('No console.* in server code', () => {
  it('should not have console.log/warn/error/info in server source files', () => {
    const violations: string[] = []
    const serverDir = join(process.cwd(), 'src/server')
    const files = findServerFiles(serverDir)

    for (const file of files) {
      const content = readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!
        if (/console\.(log|warn|error|info)\(/.test(line)) {
          const rel = relative(process.cwd(), file)
          violations.push(`${rel}:${i + 1}: ${line.trim()}`)
        }
      }
    }

    expect(violations).toEqual([])
  })
})

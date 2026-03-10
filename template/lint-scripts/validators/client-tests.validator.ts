/**
 * Client 测试覆盖验证器
 *
 * 检查 client 端文件是否有对应的测试文件：
 * 1. components/*.tsx -> components/__tests__/*.test.tsx
 * 2. pages/*.tsx -> pages/__tests__/*.test.tsx
 * 3. stores/*.ts -> stores/__tests__/*.test.ts
 * 4. hooks/*.ts -> hooks/__tests__/*.test.ts
 */

import { readdirSync, existsSync } from 'node:fs'
import { join, relative, dirname, basename } from 'node:path'
import type { ClientTestsConfig, ClientTestError, ClientTestRule } from './index.js'
import { minimatch } from 'minimatch'

interface SourceFile {
  path: string
  relativePath: string
  dir: string
  name: string
}

function findSourceFiles(rootPath: string, config: ClientTestsConfig): Map<string, SourceFile[]> {
  const filesByRule = new Map<string, SourceFile[]>()

  for (const rule of config.rules) {
    filesByRule.set(rule.dir, [])
  }

  function scanDir(dir: string) {
    if (!existsSync(dir)) return

    const entries = readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(dir, entry.name)

      if (entry.isDirectory()) {
        if (!config.ignoreDirs.includes(entry.name)) {
          scanDir(fullPath)
        }
      } else if (entry.isFile()) {
        const relativePath = relative(rootPath, fullPath)
        const fileDir = dirname(relativePath)
        const fileName = basename(entry.name)

        if (config.ignoreFiles.some(pattern => minimatch(relativePath, pattern))) {
          continue
        }

        for (const rule of config.rules) {
          if (fileDir === rule.dir && minimatch(fileName, rule.filePattern)) {
            const files = filesByRule.get(rule.dir) || []
            files.push({
              path: fullPath,
              relativePath,
              dir: rule.dir,
              name: fileName,
            })
            filesByRule.set(rule.dir, files)
          }
        }
      }
    }
  }

  for (const checkDir of config.checkDirs) {
    scanDir(join(rootPath, checkDir))
  }

  return filesByRule
}

function checkTestExists(sourceFile: SourceFile, rule: ClientTestRule, rootPath: string): boolean {
  const testsDir = join(rootPath, rule.dir, '__tests__')
  if (!existsSync(testsDir)) {
    return false
  }

  const testFiles = readdirSync(testsDir)
  const baseName = sourceFile.name.replace(/\.(tsx?|jsx?)$/, '')

  return testFiles.some(file => {
    const testBaseName = file.replace(/\.test\.(tsx?|jsx?)$/, '')
    return (
      testBaseName === baseName || minimatch(file, rule.testPattern.replace('{name}', baseName))
    )
  })
}

export function validateClientTests(
  config: ClientTestsConfig,
  rootPath: string
): ClientTestError[] {
  const errors: ClientTestError[] = []
  const filesByRule = findSourceFiles(rootPath, config)

  for (const rule of config.rules) {
    const files = filesByRule.get(rule.dir) || []

    for (const file of files) {
      const hasTest = checkTestExists(file, rule, rootPath)

      if (!hasTest) {
        const baseName = file.name.replace(/\.(tsx?|jsx?)$/, '')
        errors.push({
          file: file.relativePath,
          expectedTest: `${rule.dir}/__tests__/${baseName}.test.tsx`,
          suggestion: `为 ${file.relativePath} 添加测试文件: ${rule.dir}/__tests__/${baseName}.test.tsx`,
        })
      }
    }
  }

  return errors
}

export function formatClientTestErrors(errors: ClientTestError[]): string {
  if (errors.length === 0) return ''

  let output = `❌ Found ${errors.length} client file(s) without tests:\n\n`

  for (const err of errors) {
    output += `  📄 ${err.file}\n`
    output += `     Expected test: ${err.expectedTest}\n`
    output += `     Suggestion: ${err.suggestion}\n\n`
  }

  output += '📋 Client Test Coverage Guidelines:\n\n'
  output += '  src/client/\n'
  output += '    ├── components/\n'
  output += '    │   ├── Component.tsx\n'
  output += '    │   └── __tests__/\n'
  output += '    │       └── Component.test.tsx    # Required\n'
  output += '    ├── pages/\n'
  output += '    │   ├── Page.tsx\n'
  output += '    │   └── __tests__/\n'
  output += '    │       └── Page.test.tsx         # Required\n'
  output += '    ├── stores/\n'
  output += '    │   ├── store.ts\n'
  output += '    │   └── __tests__/\n'
  output += '    │       └── store.test.ts         # Required\n'
  output += '    └── hooks/\n'
  output += '        ├── useHook.ts\n'
  output += '        └── __tests__/\n'
  output += '            └── useHook.test.ts       # Required\n\n'
  output += '  📖 Every component, page, store, and hook should have a test file.\n'

  return output
}

/**
 * Root/Template 配置同步验证器
 *
 * 检查以下文件在 root 和 template 之间是否一致：
 * 1. eslint-rules/*.js — 所有 ESLint 自定义规则
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

export interface ConfigSyncConfig {
  rootDir: string
  templateDir: string
  checkPairs: Array<{ root: string; template: string; label: string }>
}

export interface ConfigSyncError {
  file: string
  diffType: 'missing_in_template' | 'content_differs'
  label: string
}

export function validateConfigSync(
  config: ConfigSyncConfig,
  rootPath: string
): ConfigSyncError[] {
  const errors: ConfigSyncError[] = []

  for (const pair of config.checkPairs) {
    const rootDir = join(rootPath, pair.root)
    const templateDir = join(rootPath, pair.template)

    if (!existsSync(rootDir) || !existsSync(templateDir)) continue

    const rootFiles = readdirSync(rootDir)
      .filter(f => (f.endsWith('.js') || f.endsWith('.ts')) && !f.endsWith('.test.ts') && !f.endsWith('.d.ts'))

    for (const file of rootFiles) {
      const rootContent = readFileSync(join(rootDir, file), 'utf-8')
      const templatePath = join(templateDir, file)

      if (!existsSync(templatePath)) {
        errors.push({ file, diffType: 'missing_in_template', label: pair.label })
        continue
      }

      const templateContent = readFileSync(templatePath, 'utf-8')
      if (rootContent !== templateContent) {
        errors.push({ file, diffType: 'content_differs', label: pair.label })
      }
    }
  }

  return errors
}

export function formatConfigSyncErrors(errors: ConfigSyncError[]): string {
  if (errors.length === 0) return ''

  let output = `❌ Found ${errors.length} root/template sync issue(s):\n\n`

  for (const err of errors) {
    if (err.diffType === 'missing_in_template') {
      output += `  ${err.label}/${err.file}: missing in template\n`
    } else {
      output += `  ${err.label}/${err.file}: content differs\n`
    }
  }

  output += '\n📋 Run: cp -r <root>/<dir>/* template/<dir>/ to sync\n'
  return output
}

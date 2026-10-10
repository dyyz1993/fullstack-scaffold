/**
 * 根/模板双份文件同步验证器
 *
 * 约束：以下文件在根目录与 template/ 下必须逐字节一致——它们经 package.json
 * files 白名单随模板分发给用户，任何只改一边的"单边修复"会在用户生成的
 * app 里复现旧缺陷：
 *   - eslint-rules/ 整目录（架构规则，仓库与生成 app 共享同一套语义）
 *   - scripts/create-template.ts（npm run create:module 模块脚手架）
 *   - scripts/sync-agent-hooks.mjs（agent hooks 同步工具）
 *
 * 明确排除 lint-scripts/：根版含仓库自身防线验证器（agent-hooks /
 * config-sync / no-ts-patch / 本文件）与 smart-test 的根测试选择策略，
 * 属功能性分叉，逐字节同步反而是错误目标。
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

export interface DualCopySyncError {
  rootFile: string
  templateFile: string
  message: string
}

/** 需要根/模板逐字节一致的目录 */
const SYNC_DIRS = ['eslint-rules']

/** 需要根/模板逐字节一致的单文件（相对根目录路径） */
const SYNC_FILES = ['scripts/create-template.ts', 'scripts/sync-agent-hooks.mjs']

function listFiles(dir: string, base: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      listFiles(full, base, acc)
    } else {
      acc.push(relative(base, full))
    }
  }
  return acc
}

export function validateDualCopySync(rootPath: string): DualCopySyncError[] {
  const errors: DualCopySyncError[] = []
  const pairs: Array<[string, string]> = []

  for (const rel of SYNC_DIRS) {
    const rootDir = join(rootPath, rel)
    const tplDir = join(rootPath, 'template', rel)
    if (!existsSync(rootDir) || !existsSync(tplDir)) {
      errors.push({ rootFile: rel, templateFile: `template/${rel}`, message: '目录一侧缺失' })
      continue
    }
    const rootFiles = new Set(listFiles(rootDir, rootDir))
    const tplFiles = listFiles(tplDir, tplDir)
    for (const f of rootFiles) {
      pairs.push([join(rel, f), join('template', rel, f)])
    }
    for (const f of tplFiles) {
      if (!rootFiles.has(f)) {
        errors.push({
          rootFile: '（不存在）',
          templateFile: join('template', rel, f),
          message: '模板独有文件，根侧缺失',
        })
      }
    }
  }

  for (const rel of SYNC_FILES) {
    pairs.push([rel, join('template', rel)])
  }

  for (const [rootRel, tplRel] of pairs) {
    const rootFile = join(rootPath, rootRel)
    const tplFile = join(rootPath, tplRel)
    if (!existsSync(rootFile) || !existsSync(tplFile)) {
      errors.push({ rootFile: rootRel, templateFile: tplRel, message: '文件一侧缺失' })
      continue
    }
    if (!readFileSync(rootFile).equals(readFileSync(tplFile))) {
      errors.push({ rootFile: rootRel, templateFile: tplRel, message: '内容不一致（单边修改）' })
    }
  }

  return errors
}

export function formatDualCopySyncErrors(errors: DualCopySyncError[]): string {
  const lines = errors.map(e => `  - ${e.rootFile} ↔ ${e.templateFile}: ${e.message}`)
  return `❌ 根/模板双份文件不同步（${errors.length} 处）——改动须两边同改；确属功能性分叉的文件应移入本验证器的排除说明：\n${lines.join('\n')}`
}

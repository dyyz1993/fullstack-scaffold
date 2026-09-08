/**
 * no-ts-patch validator 的单元测试
 *
 * 约束：template/patches/ 下禁止出现 TypeScript 编译器补丁。
 * 历史教训：typescript+5.9.3.patch 曾把 instantiationDepth 从 100 提到 1000
 * 来"绕过"类型爆炸（错误码 2589），代价是编辑器不稳定与编译变慢。
 * 正确做法是缩小类型面（按模块拆分 hc 客户端），而不是放宽编译器保险丝。
 */

import { describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  validateNoTsPatch,
  formatNoTsPatchErrors,
} from '../../lint-scripts/validators/no-ts-patch.validator.js'

function withTempProject(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'no-ts-patch-test-'))
  for (const [relPath, content] of Object.entries(files)) {
    const fullPath = join(dir, relPath)
    mkdirSync(join(fullPath, '..'), { recursive: true })
    writeFileSync(fullPath, content)
  }
  return dir
}

describe('no-ts-patch validator', () => {
  it('合法定制（hono patch 存在）不报错', () => {
    const dir = withTempProject({
      'template/patches/hono+4.12.16.patch': 'diff --git a/node_modules/hono/...',
      'patches/@hono+zod-validator+0.7.6.patch': 'diff --git a/...',
    })
    const errors = validateNoTsPatch(dir)
    expect(errors).toEqual([])
    rmSync(dir, { recursive: true, force: true })
  })

  it('template/patches 下出现 typescript 补丁即失败', () => {
    const dir = withTempProject({
      'template/patches/typescript+5.9.3.patch': 'diff --git a/node_modules/typescript/...',
    })
    const errors = validateNoTsPatch(dir)
    expect(errors).toHaveLength(1)
    expect(errors[0].file).toContain('typescript+5.9.3.patch')
    expect(formatNoTsPatchErrors(errors)).toContain('typescript')
    rmSync(dir, { recursive: true, force: true })
  })

  it('根 patches 下出现 typescript 补丁同样失败', () => {
    const dir = withTempProject({
      'patches/typescript+5.9.3.patch': 'diff --git a/node_modules/typescript/...',
    })
    const errors = validateNoTsPatch(dir)
    expect(errors).toHaveLength(1)
    rmSync(dir, { recursive: true, force: true })
  })

  it('目录不存在时视为通过（不误伤新仓库）', () => {
    const dir = withTempProject({})
    const errors = validateNoTsPatch(dir)
    expect(errors).toEqual([])
    rmSync(dir, { recursive: true, force: true })
  })
})

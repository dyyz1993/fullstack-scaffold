/**
 * TypeScript 编译器补丁禁止验证器
 *
 * 约束：patches/ 与 template/patches/ 下不得出现针对 typescript 包本身的补丁。
 *
 * 历史教训：typescript+5.9.3.patch 曾把 instantiationDepth 上限从 100 提到 1000，
 * 用于"绕过"巨型合并类型触发的 TS2589。这是把保险丝换粗而不是修电路：
 * 编译变慢、IDE 不稳定，且所有生成该模板的用户都被迫 patch 编译器。
 *
 * 正确做法：缩小类型面（按模块拆分 hc 客户端，见 eslint 规则
 * no-merged-api-type-export），而不是放宽编译器的递归保护。
 *
 * hono / zod 等运行时库的补丁是产品功能面，不受本验证器限制。
 */

import { readdirSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'

export interface NoTsPatchError {
  file: string
  message: string
}

const TS_PATCH_PATTERN = /^typescript\+.*\.patch$/i

/** 检查一个 patches 目录，返回违规项 */
function checkPatchesDir(patchesDir: string, rootPath: string): NoTsPatchError[] {
  const errors: NoTsPatchError[] = []

  if (!existsSync(patchesDir)) {
    return errors
  }

  for (const entry of readdirSync(patchesDir)) {
    if (TS_PATCH_PATTERN.test(entry)) {
      errors.push({
        file: relative(rootPath, join(patchesDir, entry)),
        message:
          '禁止 patch TypeScript 编译器本体。此模式曾用于放宽 instantiationDepth ' +
          '以绕过 TS2589（巨型合并类型深度爆炸），正确做法是按模块拆分 hc 客户端、' +
          '缩小类型面（参考 eslint 规则 no-merged-api-type-export）。',
      })
    }
  }

  return errors
}

export function validateNoTsPatch(rootPath: string): NoTsPatchError[] {
  return [
    ...checkPatchesDir(join(rootPath, 'patches'), rootPath),
    ...checkPatchesDir(join(rootPath, 'template', 'patches'), rootPath),
  ]
}

export function formatNoTsPatchErrors(errors: NoTsPatchError[]): string {
  if (errors.length === 0) return ''
  const lines = ['\n❌ TypeScript 编译器补丁检测失败:\n']
  for (const error of errors) {
    lines.push(`  ${error.file}`)
    lines.push(`    ${error.message}\n`)
  }
  return lines.join('\n')
}

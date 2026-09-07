/**
 * agent hooks 同步验证器（validate:all 第 17 项）
 *
 * 复用 scripts/sync-agent-hooks.mjs --check 的判定：
 * - root ↔ template 的 .zcode/ 与同步工具副本必须一致（退出码判定）
 * - 全局级（~/.zcode / ~/.codex）为开发者机器私有，漂移仅提示不阻断
 */

import { execSync } from 'node:child_process'

export interface AgentHooksError {
  message: string
}

export function validateAgentHooks(rootPath: string): AgentHooksError[] {
  try {
    const stdout = execSync('node scripts/sync-agent-hooks.mjs --check', {
      cwd: rootPath,
      encoding: 'utf8',
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    const globalDrift = stdout.includes('全局钩子过期')
    if (globalDrift) {
      // 提示但不阻断：全局配置是开发者私有的
      console.log('  ⚠️ 全局 agent hooks 过期（可选）：npm run hooks:sync -- --global')
    }
    return []
  } catch (e: unknown) {
    const err = e as { stdout?: string }
    const tail = (err.stdout ?? '').split('\n').filter(Boolean).slice(-2).join(' | ')
    return [{ message: `agent hooks 镜像漂移：${tail || 'sync-agent-hooks.mjs --check 失败'}` }]
  }
}

export function formatAgentHooksErrors(errors: AgentHooksError[]): string {
  if (errors.length === 0) return ''
  return '\n❌ Agent hooks 同步验证失败:\n' + errors.map(e => `  ${e.message}`).join('\n') + '\n'
}

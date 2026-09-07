#!/usr/bin/env node
/**
 * 禁止绕过 git hooks 的提交（规范源，root 与 template 的 .zcode/hooks/ 均为本文件副本）
 *
 * 拦截：git commit --no-verify / git commit -n / HUSKY=0 git commit / core.hooksPath=
 * 协议：stdin JSON { tool_input.command }，exit 2 = 阻断（ZCode/Codex 通用）
 *
 * 同步：修改本文件后运行 npm run hooks:check 会对账 root ↔ template 副本；
 * 全局安装（~/.zcode / ~/.codex）运行 npm run hooks:sync -- --global。
 */

let raw = ''
process.stdin.setEncoding('utf8')
for await (const chunk of process.stdin) raw += chunk

let cmd = ''
try {
  const input = JSON.parse(raw)
  cmd = input?.tool_input?.command ?? input?.command ?? ''
} catch {
  process.exit(0) // 无法解析的输入不拦截
}
if (typeof cmd !== 'string' || cmd === '') process.exit(0)

const offenders = new Set()

for (const seg of cmd.split(/&&|\|\||;|\n/)) {
  const tokens = seg.trim().split(/\s+/)
  const gitIdx = tokens.indexOf('git')
  if (gitIdx === -1) continue

  if (/(^|\s)HUSKY=0(\s|$)/.test(seg)) offenders.add('HUSKY=0')

  const commitIdx = tokens.indexOf('commit')
  if (commitIdx === -1 || commitIdx < gitIdx) continue

  if (tokens.includes('--no-verify')) offenders.add('--no-verify')
  if (tokens.includes('-n')) offenders.add('-n')
  if (tokens.some(t => t.startsWith('core.hooksPath='))) offenders.add('core.hooksPath')
}

if (offenders.size > 0) {
  console.error(
    `⛔ 检测到绕过 git hooks 的提交方式（${[...offenders].join(', ')}）。` +
      'pre-commit 是本仓库的质量门禁（typecheck / validators / framework / tests），' +
      '禁止跳过。请修复失败项后正常提交；确有特殊原因，请让用户在终端手动执行。'
  )
  process.exit(2)
}

process.exit(0)

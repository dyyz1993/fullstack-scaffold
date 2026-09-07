#!/usr/bin/env node
/**
 * agent hooks 同步工具（规范源：仓库 .zcode/hooks/no-no-verify.mjs）
 *
 * 用法：
 *   node scripts/sync-agent-hooks.mjs            # 探测环境并报告状态
 *   node scripts/sync-agent-hooks.mjs --global   # 同步安装到各 agent 全局配置
 *   node scripts/sync-agent-hooks.mjs --check    # 漂移检查（CI / validate:all 用）
 *
 * 两层模型：
 *   工作区级（.zcode/config.json 随仓库走）——修改后 git pull 即生效，无需本工具
 *   全局级（~/.zcode、~/.codex）——开发者机器私有，用 --global 显式同步；
 *           修改规范源后需重跑 --global（--check 会提示过期）
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const CANONICAL = path.join(ROOT, '.zcode/hooks/no-no-verify.mjs')

const args = process.argv.slice(2)
const MODE = args.includes('--check') ? 'check' : args.includes('--global') ? 'global' : 'status'

// ---------- 环境探测 ----------

function detectAgents() {
  const home = homedir()
  return {
    zcode: {
      installed: existsSync(path.join(home, '.zcode')),
      globalConfig: path.join(home, '.zcode/cli/config.json'),
      globalHooksDir: path.join(home, '.zcode/cli/hooks'),
    },
    codex: {
      installed: existsSync(path.join(home, '.codex')),
      configToml: path.join(home, '.codex/config.toml'),
      hooksDir: path.join(home, '.codex/hooks'),
    },
    claude: { installed: existsSync(path.join(home, '.claude')) },
    cursor: { installed: existsSync(path.join(home, '.cursor')) },
  }
}

// ---------- ZCode 全局（幂等注册） ----------

function syncZCodeGlobal(agents, apply) {
  const target = path.join(agents.zcode.globalHooksDir, 'no-no-verify.mjs')
  const cmd = `node ${JSON.stringify(target).replace(/"/g, '')}`
  const cfgPath = agents.zcode.globalConfig
  if (!existsSync(cfgPath)) return { status: 'skip', detail: `未找到 ${cfgPath}` }

  const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'))
  cfg.hooks ??= {}
  cfg.hooks.enabled = true
  cfg.hooks.events ??= {}
  const list = (cfg.hooks.events.PreToolUse ??= [])
  const command = `node ${target}`
  const exists = list.some(g => (g.hooks || []).some(h => /no-verify/.test(h.command || '')))

  // 无条件幂等归一：清掉所有 no-verify 家族条目（含旧 block-no-verify 命名），
  // 再注册规范条目 —— 重复执行结果一致，也不会新旧双轨
  for (const g of list) {
    g.hooks = (g.hooks || []).filter(h => !/no-verify/.test(h.command || ''))
  }
  list.push({ matcher: 'Bash', hooks: [{ type: 'command', command, enabled: true, timeoutMs: 5000 }] })
  const changed = true
  const installedUpToDate = existsSync(target) && readFileSync(target, 'utf8') === readFileSync(CANONICAL, 'utf8')

  if (MODE === 'check') {
    if (!installedUpToDate) return { status: 'drift', detail: '全局脚本与规范源不一致，运行 npm run hooks:sync -- --global' }
    return { status: 'ok', detail: '已安装且为最新' }
  }
  if (MODE === 'global' && apply) {
    if (!installedUpToDate) {
      mkdirSync(agents.zcode.globalHooksDir, { recursive: true })
      copyFileSync(CANONICAL, target)
    }
    if (changed || !installedUpToDate) writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n')
    return { status: 'ok', detail: `已同步 → ${target}` }
  }
  return { status: exists ? 'ok' : 'missing', detail: exists ? '已注册' : '未注册' }
}

// ---------- Codex 全局（TOML 幂等追加） ----------

const CODEX_BLOCK = (scriptPath) => `# >>> scaffold agent-hooks（npm run hooks:sync 管理，勿手改） >>>
[[hooks.PreToolUse]]
matcher = "^Bash$"

[[hooks.PreToolUse.hooks]]
type = "command"
command = "node ${scriptPath}"
timeout = 5
statusMessage = "Checking for forbidden --no-verify"
# <<< scaffold agent-hooks <<<`

function syncCodexGlobal(agents, apply) {
  if (!agents.codex.installed || !existsSync(agents.codex.configToml)) {
    return { status: 'skip', detail: '未检测到 Codex' }
  }
  const target = path.join(agents.codex.hooksDir, 'no-no-verify.mjs')
  const toml = readFileSync(agents.codex.configToml, 'utf8')
  const hasBlock = toml.includes('scaffold agent-hooks')

  if (MODE === 'check') {
    const upToDate = hasBlock && existsSync(target) && readFileSync(target, 'utf8') === readFileSync(CANONICAL, 'utf8')
    if (!upToDate) return { status: 'drift', detail: 'Codex 全局钩子缺失或过期，运行 npm run hooks:sync -- --global' }
    return { status: 'ok', detail: '已安装且为最新' }
  }
  if (MODE === 'global' && apply) {
    mkdirSync(agents.codex.hooksDir, { recursive: true })
    copyFileSync(CANONICAL, target)
    if (!hasBlock) {
      writeFileSync(agents.codex.configToml, toml.trimEnd() + '\n\n' + CODEX_BLOCK(target) + '\n')
    }
    return {
      status: 'ok',
      detail: `已同步 → ${target}（config.toml 若有 trust-hash 机制需在 Codex 内重新信任）`,
    }
  }
  return { status: hasBlock ? 'ok' : 'missing', detail: hasBlock ? '已注册' : '未注册（--global 安装）' }
}

// ---------- root ↔ template 副本对账 ----------

function checkTemplateMirror() {
  const pairs = [
    ['.zcode/hooks/no-no-verify.mjs', '.zcode/hooks/no-no-verify.mjs'],
    ['.zcode/config.json', '.zcode/config.json'],
    ['scripts/sync-agent-hooks.mjs', 'scripts/sync-agent-hooks.mjs'],
  ]
  const issues = []
  for (const [rootRel, tplRel] of pairs) {
    const a = path.join(ROOT, rootRel)
    const b = path.join(ROOT, 'template', tplRel)
    if (!existsSync(a) || !existsSync(b)) {
      issues.push(`缺失：${rootRel} ↔ template/${tplRel}`)
    } else if (readFileSync(a, 'utf8') !== readFileSync(b, 'utf8')) {
      issues.push(`内容漂移：${rootRel} ↔ template/${tplRel}`)
    }
  }
  return issues
}

// ---------- 主流程 ----------

const agents = detectAgents()
const results = []

if (MODE === 'check' || MODE === 'status') {
  const mirrorIssues = checkTemplateMirror()
  results.push({ agent: 'root↔template', r: mirrorIssues.length ? { status: 'drift', detail: mirrorIssues.join('; ') } : { status: 'ok', detail: '镜像一致' } })
}
results.push({ agent: 'ZCode 全局', r: syncZCodeGlobal(agents, MODE === 'global') })
results.push({ agent: 'Codex 全局', r: syncCodexGlobal(agents, MODE === 'global') })

if (MODE === 'status') {
  console.log('🔍 Agent 环境探测：')
  for (const [name, a] of Object.entries(agents)) console.log(`  ${a.installed ? '✓' : '–'} ${name}`)
  console.log('\n🪝 钩子状态（工作区级 .zcode/ 随仓库自动生效）：')
}
for (const { agent, r } of results) {
  const icon = r.status === 'ok' ? '✓' : r.status === 'drift' ? '❌' : r.status === 'missing' ? '⚠️' : '–'
  console.log(`  ${icon} ${agent}：${r.detail}`)
}

if (MODE === 'global') console.log('\n✅ 全局同步完成。工作区钩子（.zcode/）无需本工具，随 git 自动生效。')

if (MODE === 'check') {
  // 退出码只由 root↔template 镜像决定；全局级是开发者机器私有（缺失/过期仅提示），
  // 否则无 ~/.zcode 的 CI runner 或新同事会被误伤
  const mirrorDrift = results.find(x => x.agent === 'root↔template' && x.r.status === 'drift')
  if (mirrorDrift) {
    console.error('\n❌ hooks 镜像漂移（root ↔ template），请同步副本后重试')
    process.exit(1)
  }
  if (results.some(({ r }) => r.status === 'drift')) {
    console.log('\n⚠️ 全局钩子过期：运行 npm run hooks:sync -- --global 更新本机配置')
  }
}

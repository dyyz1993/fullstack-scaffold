/* eslint-disable no-console */
import readline from 'node:readline'
import chalk from 'chalk'
import type {
  BackendModule,
  DatabaseType,
  DeployTarget,
  FrontendChannel,
  ProjectConfig,
} from '../types.js'
import { validateConfig } from '../types.js'
import { moduleRegistry } from '../module-registry.js'

function createRL(): readline.Interface {
  return readline.createInterface({ input: process.stdin, output: process.stdout })
}

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, answer => resolve(answer.trim())))
}

function printHeader(text: string): void {
  console.log('')
  console.log(chalk.cyan.bold(`  ── ${text} ──`))
  console.log('')
}

async function selectOne<T extends string>(
  rl: readline.Interface,
  message: string,
  options: { value: T; label: string }[],
  defaultIndex: number = 0
): Promise<T> {
  console.log(chalk.bold(`  ${message}`))
  options.forEach((opt, i) => {
    const marker = i === defaultIndex ? chalk.green('●') : chalk.gray('○')
    const suffix = i === defaultIndex ? chalk.gray(' (default)') : ''
    console.log(`    ${marker} ${i + 1}. ${opt.label}${suffix}`)
  })
  console.log('')

  const answer = await ask(rl, chalk.gray('  请输入序号: '))
  if (!answer) return options[defaultIndex].value

  const idx = parseInt(answer, 10) - 1
  if (idx >= 0 && idx < options.length) return options[idx].value

  console.log(chalk.yellow(`  无效选择，使用默认: ${options[defaultIndex].label}`))
  return options[defaultIndex].value
}

async function selectMultiple<T extends string>(
  rl: readline.Interface,
  message: string,
  options: {
    value: T
    label: string
    description?: string
    disabled?: boolean
    checked?: boolean
  }[]
): Promise<T[]> {
  console.log(chalk.bold(`  ${message}`))
  console.log(chalk.gray('    输入序号，逗号分隔 (如 1,3,5)。空格分隔也可以。'))
  console.log('')

  const disabledIndices: number[] = []
  options.forEach((opt, i) => {
    const check = opt.checked ? chalk.green('■') : chalk.gray('□')
    const suffix = opt.disabled ? chalk.red(' (必选)') : ''
    const desc = opt.description ? chalk.gray(` — ${opt.description}`) : ''
    console.log(`    ${check} ${i + 1}. ${opt.label}${desc}${suffix}`)
    if (opt.disabled) disabledIndices.push(i)
  })
  console.log('')

  const checkedDefaults = options
    .map((opt, i) => (opt.checked || opt.disabled ? i + 1 : 0))
    .filter(v => v > 0)
    .join(',')

  const answer = await ask(rl, chalk.gray(`  请输入序号 [${checkedDefaults}]: `))

  let selectedIndices: number[]
  if (!answer) {
    selectedIndices = options
      .map((_, i) => i)
      .filter(i => options[i].checked || options[i].disabled)
  } else {
    const parsed = answer
      .split(/[,\s]+/)
      .map(s => parseInt(s.trim(), 10) - 1)
      .filter(i => i >= 0 && i < options.length)
    const forced = options.map((_, i) => i).filter(i => options[i].disabled)
    selectedIndices = [...new Set([...parsed, ...forced])].sort((a, b) => a - b)
  }

  return selectedIndices.map(i => options[i].value)
}

async function confirm(
  rl: readline.Interface,
  message: string,
  defaultYes: boolean = true
): Promise<boolean> {
  const hint = defaultYes ? 'Y/n' : 'y/N'
  const answer = await ask(rl, chalk.gray(`  ${message} [${hint}]: `))
  if (!answer) return defaultYes
  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes'
}

const ALL_CHANNELS: { value: FrontendChannel; label: string; description: string }[] = [
  { value: 'web', label: 'Web', description: 'React SPA 前端' },
  { value: 'ops', label: 'Ops', description: '运营管理后台' },
  { value: 'cli', label: 'CLI', description: '命令行工具' },
  { value: 'mobile', label: 'Mobile', description: '移动端 (API 模式)' },
  { value: 'miniapp', label: 'MiniApp', description: '小程序 (API 模式)' },
]

type ModuleCategory = 'basic' | 'ai' | 'security' | 'ops' | 'tenant'

const CATEGORY_LABELS: Record<ModuleCategory, string> = {
  basic: '📦 基础功能',
  ai: '🤖 AI',
  security: '🔒 安全',
  ops: '🛠️ 运营后台',
  tenant: '🏢 多租户',
}

const OPS_EXCLUSIVE_MODULES: BackendModule[] = ['order', 'ticket', 'dispute', 'content']
const OPS_REQUIRED_MODULES: BackendModule[] = ['permission', 'ops']

function getAvailableModules(
  channels: FrontendChannel[],
  backend: boolean
): {
  modules: {
    value: BackendModule
    label: string
    description: string
    disabled?: boolean
    category: ModuleCategory
  }[]
} {
  if (!backend) return { modules: [] }

  const hasOps = channels.includes('ops')
  const allModules = Object.entries(moduleRegistry) as [
    BackendModule,
    (typeof moduleRegistry)[string],
  ][]

  const modules = allModules
    .filter(([key]) => {
      if (!hasOps && OPS_EXCLUSIVE_MODULES.includes(key)) return false
      return true
    })
    .map(([key, def]) => ({
      value: key,
      label: def.label,
      description: def.description,
      category: def.category as ModuleCategory,
      disabled: hasOps && OPS_REQUIRED_MODULES.includes(key),
    }))

  return { modules }
}

function displayPreview(config: ProjectConfig): void {
  console.log('')
  console.log(chalk.cyan.bold('  ══════════ 项目配置预览 ══════════'))
  console.log('')
  console.log(chalk.white(`  项目名称:   ${chalk.green(config.name)}`))
  console.log(chalk.white(`  前端通道:   ${chalk.green(config.channels.join(', ') || '(无)')}`))
  console.log(chalk.white(`  后端:       ${chalk.green(config.backend ? '是' : '否')}`))
  if (config.backend) {
    console.log(chalk.white(`  后端模块:   ${chalk.green(config.modules.join(', ') || '(无)')}`))
    console.log(chalk.white(`  部署方式:   ${chalk.green(config.deploy)}`))
    console.log(chalk.white(`  数据库:     ${chalk.green(config.database)}`))
  }
  console.log('')
}

async function collectChannels(rl: readline.Interface): Promise<FrontendChannel[]> {
  printHeader('Step 1/5: 选择前端通道')
  return selectMultiple(rl, '选择需要的前端通道:', ALL_CHANNELS)
}

async function collectBackend(
  rl: readline.Interface,
  channels: FrontendChannel[]
): Promise<boolean> {
  if (channels.some(ch => ch !== 'web')) return true
  if (channels.length === 0) return true

  printHeader('Step 2/5: 后端服务')
  return confirm(rl, '是否需要后端服务?')
}

async function collectModules(
  rl: readline.Interface,
  channels: FrontendChannel[],
  backend: boolean
): Promise<BackendModule[]> {
  if (!backend) return []

  printHeader('Step 3/5: 选择后端模块')

  const { modules } = getAvailableModules(channels, backend)
  const hasOps = channels.includes('ops')

  const categories = ['basic', 'ai', 'security', 'ops', 'tenant'] as ModuleCategory[]
  const selected: BackendModule[] = [...(hasOps ? OPS_REQUIRED_MODULES : [])]

  for (const cat of categories) {
    const catModules = modules.filter(m => m.category === cat)
    if (catModules.length === 0) continue

    console.log('')
    console.log(chalk.bold(`  ${CATEGORY_LABELS[cat]}`))

    const chosen = await selectMultiple(
      rl,
      `选择 ${CATEGORY_LABELS[cat]} 模块:`,
      catModules.map(m => ({
        value: m.value,
        label: m.label,
        description: m.description,
        disabled: m.disabled,
        checked: m.disabled,
      }))
    )

    for (const v of chosen) {
      if (!selected.includes(v)) selected.push(v)
    }
  }

  return selected
}

async function collectDeploy(rl: readline.Interface, backend: boolean): Promise<DeployTarget> {
  if (!backend) return 'node'

  printHeader('Step 4/5: 部署方式')
  return selectOne(rl, '选择部署方式:', [
    { value: 'node' as DeployTarget, label: 'Node.js — 传统服务器 / Docker' },
    { value: 'cloudflare' as DeployTarget, label: 'Cloudflare Workers — Serverless' },
  ])
}

async function collectDatabase(
  rl: readline.Interface,
  deploy: DeployTarget,
  backend: boolean
): Promise<DatabaseType> {
  if (!backend) return 'sqlite'

  printHeader('Step 5/5: 数据库')

  if (deploy === 'cloudflare') {
    console.log(chalk.gray('  Cloudflare 部署自动使用 D1 数据库'))
    return 'd1'
  }

  return selectOne(rl, '选择数据库:', [
    { value: 'sqlite' as DatabaseType, label: 'SQLite — 零配置，开发友好' },
    { value: 'mysql' as DatabaseType, label: 'MySQL — 生产级关系数据库' },
  ])
}

export async function collectConfig(projectName: string): Promise<ProjectConfig> {
  const rl = createRL()

  try {
    while (true) {
      const channels = await collectChannels(rl)
      const backend = await collectBackend(rl, channels)
      const modules = await collectModules(rl, channels, backend)
      const deploy = await collectDeploy(rl, backend)
      const database = await collectDatabase(rl, deploy, backend)

      const config: ProjectConfig = {
        name: projectName,
        channels,
        backend,
        modules,
        deploy,
        database,
      }

      const { errors, warnings } = validateConfig(config)

      if (warnings.length > 0) {
        console.log('')
        for (const w of warnings) {
          console.log(chalk.yellow(`  ⚠ ${w.message}`))
        }
        console.log('')
        const proceed = await confirm(rl, '存在警告，是否继续?')
        if (!proceed) continue
      }

      if (errors.length > 0) {
        console.log('')
        for (const e of errors) {
          console.log(chalk.red(`  ✖ ${e.message}`))
        }
        console.log('')
        console.log(chalk.yellow('  配置有误，请重新选择...'))
        continue
      }

      displayPreview(config)
      const confirmed = await confirm(rl, '确认创建此配置?')
      if (confirmed) return config

      console.log(chalk.yellow('  重新开始配置...'))
    }
  } finally {
    rl.close()
  }
}

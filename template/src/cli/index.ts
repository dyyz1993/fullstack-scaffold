import { Core, type CoreConfig } from '@dyyz1993/xcli-core'
import { registerBuiltinCommands } from './modules'

const coreConfig: CoreConfig = {
  name: 'biomimic',
  version: '0.1.0',
  description: 'Biomimic CLI - RPC service & code generation tools',
  configDirName: '.biomimic',
  envPrefix: 'BIOMIMIC',
  pluginDirs: [],
}

const app = new Core(coreConfig)

// Register builtin commands (todo/notification/config modules)
registerBuiltinCommands(app)

/**
 * argv 规范化：`todos list` → `todos.list`。
 *
 * 模块命令按命名空间注册为点分名（todos.list / tickets.list），而 Core.run
 * 只把 argv[0] 当命令名、其余当参数，因此把开头连续的位置 token 重新 join
 * 成已注册的命令路径（最长优先匹配），flag 参数原样保留。
 */
function normalizeCommandArgv(instance: Core, argv: string[]): string[] {
  const known = new Set<string>()
  for (const site of instance.loader.getSites()) {
    for (const cmd of site.getAllCommands()) {
      known.add(cmd.name)
    }
  }

  const tokens: string[] = []
  let i = 0
  while (i < argv.length && !argv[i].startsWith('-')) {
    tokens.push(argv[i])
    i++
  }
  if (tokens.length < 2) {
    return argv
  }
  for (let end = tokens.length; end >= 2; end--) {
    const joined = tokens.slice(0, end).join('.')
    if (known.has(joined)) {
      return [joined, ...tokens.slice(end), ...argv.slice(i)]
    }
  }
  return argv
}

// Execute CLI（argv 规范化后再交给 core 分发）
const exitCode = await app.run(normalizeCommandArgv(app, process.argv.slice(2)))
process.exit(exitCode)

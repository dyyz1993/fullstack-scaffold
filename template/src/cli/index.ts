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

// Execute CLI
const exitCode = await app.run(process.argv.slice(2))
process.exit(exitCode)

import { program } from 'commander'
import { registerModules } from './modules'
import { setBaseUrl } from './utils/api'
import { createLogger } from './utils/logger'
import { createProject } from '../commands/create'
import type { CreateOptions } from '../commands/create'

const MODULE_COMMANDS = ['todo', 'notification', 'config']

program
  .name('create-fullstack-scaffold')
  .description('Create a new fullstack scaffolded project')
  .version('0.1.1')
  .argument('[project-name]', 'Name of the project to create')
  .option('-v, --verbose', 'Enable verbose output')
  .option('-u, --url <url>', 'Server URL', 'http://localhost:3010')
  .option('-p, --preset <preset>', 'Template preset to use', 'fullstack-admin')
  .option('-d, --dry-run', 'Preview files without creating them')
  .option('--current-dir', 'Scaffold in the current directory')
  .action(async (projectName: string | undefined, cmdOptions: Record<string, unknown>) => {
    if (projectName && !MODULE_COMMANDS.includes(projectName)) {
      const isCurrentDir = cmdOptions.currentDir === true || projectName === '.'
      createLogger({ verbose: cmdOptions.verbose as boolean | undefined })

      const options: CreateOptions = {
        projectName: isCurrentDir ? '.' : projectName,
        currentDir: isCurrentDir,
        preset: cmdOptions.preset as string | undefined,
        dryRun: cmdOptions.dryRun as boolean | undefined,
      }

      await createProject(options).catch((err: Error) => {
        console.error(`Error: ${err.message}`)
        process.exit(1)
      })
      return
    }

    if (!projectName) {
      program.outputHelp()
      process.exit(1)
    }
  })

program.hook('preAction', thisCommand => {
  const options = thisCommand.opts()
  createLogger({ verbose: options.verbose })
  if (options.url) {
    setBaseUrl(options.url)
  }
})

registerModules(program)

program.parse()

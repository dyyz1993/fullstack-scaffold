import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Command } from 'commander'
import chalk from 'chalk'
import { select } from '@inquirer/prompts'
import { createProject, ScaffoldError } from './commands/create.js'
import { loadPresets } from './generators/template-generator.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// __dirname is:
//   - dev: .../create-biomimic-app/src
//   - built: .../create-biomimic-app/dist/cli
// Both should resolve rootDir to the package root (where package.json + template/ live)
const rootDir = __dirname.endsWith(path.join('src'))
  ? path.resolve(__dirname, '..')
  : __dirname.endsWith(path.join('dist', 'cli'))
  ? path.resolve(__dirname, '..', '..')
  : path.resolve(__dirname, '..', '..')

const packageJson = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf-8'))

const program = new Command()

program
  .name('create-fullstack-scaffold')
  .description('Create a new full-stack scaffold app with Todo List example')
  .version(packageJson.version)
  .argument('[project-name]', 'Name of your project')
  .option('-c, --current-dir', 'Create project in current directory')
  .option(
    '-p, --preset <preset>',
    'Template preset to use (fullstack-admin, todo-app, ecommerce, xbrowser-marketplace, forum, cli-only, minimal, saas)'
  )
  .option('-o, --output-dir <path>', 'Output directory (defaults to project name)')
  .option('--dry-run', 'Show what would be generated without creating files')
  .option('--no-install', 'Skip automatic dependency installation')
  .action(
    async (
      projectName = 'my-fullstack-app',
      options: {
        currentDir?: boolean
        preset?: string
        outputDir?: string
        dryRun?: boolean
        install?: boolean
      }
    ) => {
      console.log('')
      console.log(chalk.cyan.bold('  ╔══════════════════════════════════════════╗'))
      console.log(chalk.cyan.bold('  ║   Create Fullstack Scaffold App          ║'))
      console.log(chalk.cyan.bold('  ║   React + Hono + Vite + Zustand + TS     ║'))
      console.log(chalk.cyan.bold('  ╚══════════════════════════════════════════╝'))
      console.log('')

      let preset = options.preset

      if (!preset && process.stdin.isTTY) {
        const templateDir = path.join(rootDir, 'template')
        const presets = await loadPresets(templateDir)
        preset = await select({
          message: 'Choose a template preset:',
          choices: presets.map(p => ({
            value: p.id,
            name: `${p.name} — ${p.description}`,
          })),
        })
      }

      if (!preset) {
        preset = 'fullstack-admin'
      }

      try {
        await createProject({
          projectName,
          currentDir: options.currentDir ?? false,
          preset,
          outputDir: options.outputDir,
          dryRun: options.dryRun ?? false,
          install: options.install,
        })
      } catch (error) {
        if (error instanceof ScaffoldError) {
          console.error(chalk.red(`  ✖ ${error.message}`))
          process.exit(1)
        }
        throw error
      }
    }
  )

program
  .command('presets')
  .description('List available template presets')
  .action(async () => {
    const templateDir = path.join(rootDir, 'template')
    const presets = await loadPresets(templateDir)
    console.log(chalk.cyan('\nAvailable presets:\n'))
    for (const preset of presets) {
      console.log(`  ${chalk.green(preset.id.padEnd(20))} ${preset.name}`)
      console.log(`  ${' '.repeat(20)} ${preset.description}`)
      console.log(`  ${' '.repeat(20)} Modules: ${preset.modules.join(', ')}`)
      console.log()
    }
  })

program.parse()

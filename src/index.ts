#!/usr/bin/env -S tsx

import { Command } from 'commander'
import chalk from 'chalk'
import { collectConfig } from './commands/prompts.js'
import { generateProject } from './commands/generator.js'

const packageJson = await import('../package.json', {
  assert: { type: 'json' },
})

const program = new Command()

program
  .name('create-biomimic-app')
  .description('Create a new BioMimic app - 组合式全栈项目生成器')
  .version(packageJson.default.version)
  .argument('[project-name]', 'Name of your project')
  .option('-c, --current-dir', 'Create project in current directory')
  .action(async (projectName?: string, options?: { currentDir?: boolean }) => {
    console.log('')
    console.log(chalk.cyan.bold('  ╔══════════════════════════════════════════╗'))
    console.log(chalk.cyan.bold('  ║   Create BioMimic App                    ║'))
    console.log(chalk.cyan.bold('  ║   组合式全栈项目生成器                     ║'))
    console.log(chalk.cyan.bold('  ╚══════════════════════════════════════════╝'))
    console.log('')

    try {
      if (!projectName && !options?.currentDir) {
        const { default: readline } = await import('node:readline')
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
        projectName = await new Promise<string>(resolve => {
          rl.question(chalk.gray('  请输入项目名称: '), answer => {
            rl.close()
            resolve(answer.trim() || 'my-biomimic-app')
          })
        })
      }

      if (options?.currentDir) {
        const path = await import('node:path')
        projectName = path.basename(process.cwd())
      }

      const config = await collectConfig(projectName!)
      await generateProject(config, options?.currentDir)
    } catch (error) {
      console.error(
        chalk.red('\n  ✖ 创建项目时发生错误:'),
        error instanceof Error ? error.message : String(error)
      )
      process.exit(1)
    }
  })

program.parse()

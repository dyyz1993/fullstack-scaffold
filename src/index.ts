#!/usr/bin/env -S tsx

import { Command } from 'commander';
import chalk from 'chalk';
import { createProject } from './commands/create.js';

const packageJson = await import('../package.json', {
  assert: { type: 'json' }
});

const program = new Command();

program
  .name('create-biomimic-app')
  .description('Create a new BioMimic app with Todo List example')
  .version(packageJson.default.version)
  .argument('[project-name]', 'Name of your project')
  .action(async (projectName = 'my-biomimic-app') => {
    console.log('');
    console.log(chalk.cyan.bold('  ╔══════════════════════════════════════════╗'));
    console.log(chalk.cyan.bold('  ║   Create BioMimic App                    ║'));
    console.log(chalk.cyan.bold('  ║   React + Vite + Zustand + Tailwind      ║'));
    console.log(chalk.cyan.bold('  ╚══════════════════════════════════════════╝'));
    console.log('');

    await createProject(projectName);
  });

program.parse();

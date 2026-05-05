#!/usr/bin/env -S tsx

import { Command } from "commander";
import chalk from "chalk";
import { createProject, ScaffoldError } from "./commands/create.js";

const packageJson = await import("../package.json", {
  assert: { type: "json" },
});

const program = new Command();

program
  .name("create-biomimic-app")
  .description("Create a new BioMimic app with Todo List example")
  .version(packageJson.default.version)
  .argument("[project-name]", "Name of your project")
  .option("-c, --current-dir", "Create project in current directory")
  .action(
    async (
      projectName = "my-biomimic-app",
      options: { currentDir: boolean },
    ) => {
      console.log("");
      console.log(
        chalk.cyan.bold("  ╔══════════════════════════════════════════╗"),
      );
      console.log(
        chalk.cyan.bold("  ║   Create BioMimic App                    ║"),
      );
      console.log(
        chalk.cyan.bold("  ║   React + Vite + Zustand + Tailwind      ║"),
      );
      console.log(
        chalk.cyan.bold("  ╚══════════════════════════════════════════╝"),
      );
      console.log("");

      try {
        await createProject(projectName, options?.currentDir);
      } catch (error) {
        if (error instanceof ScaffoldError) {
          console.error(chalk.red(`  ✖ ${error.message}`));
          process.exit(1);
        }
        throw error;
      }
    },
  );

program.parse();

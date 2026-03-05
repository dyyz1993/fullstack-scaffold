import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import chalk from "chalk";
import ora from "ora";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createProject(
  projectName: string,
  useCurrentDir: boolean = false,
): Promise<void> {
  const templateDir = path.join(__dirname, "../../template");
  let targetDir: string;

  if (useCurrentDir) {
    targetDir = process.cwd();
  } else {
    targetDir = path.resolve(process.cwd(), projectName);
    if (await fs.pathExists(targetDir)) {
      console.error(chalk.red(`  ✖ 目录 ${projectName} 已存在`));
      process.exit(1);
    }
  }

  try {
    if (!useCurrentDir) {
      const spinner = ora("Creating project directory...").start();
      await fs.ensureDir(targetDir);
      spinner.succeed(chalk.green("Project directory created"));
    }

    const spinner = ora("Copying template files...").start();
    await fs.copy(templateDir, targetDir, {
      filter: (src: string) => {
        const relative = path.relative(templateDir, src);
        return !relative.startsWith("node_modules");
      },
    });
    spinner.succeed(chalk.green("Template files copied"));

    spinner.start("Configuring package.json...");
    const pkgJsonPath = path.join(targetDir, "package.json");
    const pkgJson = await fs.readJson(pkgJsonPath);
    pkgJson.name = useCurrentDir ? path.basename(targetDir) : projectName;
    await fs.writeJson(pkgJsonPath, pkgJson, { spaces: 2 });
    spinner.succeed(chalk.green("package.json configured"));

    console.log("");
    console.log(chalk.green("  ✓ Project created successfully!"));
    console.log("");
    console.log(chalk.cyan("  Next steps:"));
    if (!useCurrentDir) {
      console.log(chalk.white(`    cd ${projectName}`));
    }
    console.log(chalk.white("    npm install"));
    console.log(chalk.white("    npm run dev"));
    console.log("");
    console.log(chalk.gray("  Happy coding! 🐟"));
    console.log("");
  } catch (error) {
    console.error(chalk.red("  ✖ Error creating project:"), error);
    process.exit(1);
  }
}

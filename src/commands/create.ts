import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import chalk from "chalk";
import ora from "ora";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseGitignore(content: string): string[] {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("!"))
    .map((pattern) => pattern.replace(/\/$/, ""))
    .map((pattern) => pattern.replace(/^\*\./, ""))
    .map((pattern) => pattern.replace(/^\/+/, ""))
    .filter((pattern) => !pattern.includes("*"));
}

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
    const gitignorePath = path.join(templateDir, ".gitignore");
    let ignorePatterns: string[] = [];
    if (await fs.pathExists(gitignorePath)) {
      const gitignoreContent = await fs.readFile(gitignorePath, "utf-8");
      ignorePatterns = parseGitignore(gitignoreContent);
    }
    ignorePatterns.push("node_modules", ".wrangler", ".trae");
    await fs.copy(templateDir, targetDir, {
      filter: (src: string) => {
        const relative = path.relative(templateDir, src);
        if (relative === "") return true;
        return !ignorePatterns.some((pattern) => relative.startsWith(pattern));
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

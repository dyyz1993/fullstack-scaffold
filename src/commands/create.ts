import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import chalk from "chalk";
import ora from "ora";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Template placeholder values that need to be replaced
const TEMPLATE_PROJECT_NAME = "biomimic-todo-app";
const TEMPLATE_DB_NAME = "biomimic-todo-db";

function parseGitignore(content: string): string[] {
    const negatePatterns: string[] = [];
    const includePatterns = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        if (line.startsWith("!")) {
          negatePatterns.push(line.slice(1));
          return null;
        }
        return line;
      })
      .filter((line): line is string => line !== null)
      .map((pattern) => pattern.replace(/\/$/, ""))
      .map((pattern) => pattern.replace(/^\*\./, ""))
      .map((pattern) => pattern.replace(/^\/+/, ""))
      .filter((pattern) => !pattern.includes("*"));
    return [...includePatterns, ...negatePatterns.map((p) => `!${p}`)];
}

/**
 * Generate a database name from project name
 * e.g., "my-project" -> "my-project-db"
 */
function generateDbName(projectName: string): string {
  // Remove special characters and convert to lowercase
  const sanitized = projectName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${sanitized}-db`;
}

/**
 * Update wrangler.toml with new project name and database name
 */
async function updateWranglerToml(
  targetDir: string,
  projectName: string,
): Promise<void> {
  const wranglerPath = path.join(targetDir, "wrangler.toml");
  if (!(await fs.pathExists(wranglerPath))) {
    return;
  }

  let content = await fs.readFile(wranglerPath, "utf-8");
  const dbName = generateDbName(projectName);

  // Replace worker name
  content = content.replace(
    new RegExp(`^name = "${TEMPLATE_PROJECT_NAME}"`, "m"),
    `name = "${projectName}"`,
  );

  // Replace database name
  content = content.replace(
    new RegExp(`database_name = "${TEMPLATE_DB_NAME}"`, "g"),
    `database_name = "${dbName}"`,
  );

  // Clear the database_id to force user to create a new one
  content = content.replace(
    /database_id = "[^"]+"/,
    `database_id = ""  # TODO: Run 'wrangler d1 create ${dbName}' and paste the ID here`,
  );

  await fs.writeFile(wranglerPath, content);
}

/**
 * Update package.json with new project name
 */
async function updatePackageJson(
  targetDir: string,
  projectName: string,
): Promise<void> {
  const pkgJsonPath = path.join(targetDir, "package.json");
  if (!(await fs.pathExists(pkgJsonPath))) {
    return;
  }

  const pkgJson = await fs.readJson(pkgJsonPath);
  pkgJson.name = projectName;

  // Remove bin field if it exists (CLI binary should not be published with new projects)
  if (pkgJson.bin) {
    delete pkgJson.bin;
  }

  await fs.writeJson(pkgJsonPath, pkgJson, { spaces: 2 });
}

/**
 * Update package-lock.json with new project name
 */
async function updatePackageLockJson(
  targetDir: string,
  projectName: string,
): Promise<void> {
  const lockFilePath = path.join(targetDir, "package-lock.json");
  if (!(await fs.pathExists(lockFilePath))) {
    return;
  }

  const lockFile = await fs.readJson(lockFilePath);

  // Update root name
  if (lockFile.name === TEMPLATE_PROJECT_NAME) {
    lockFile.name = projectName;
  }

  // Update packages[""].name if it exists
  if (lockFile.packages?.[""]?.name === TEMPLATE_PROJECT_NAME) {
    lockFile.packages[""].name = projectName;
  }

  await fs.writeJson(lockFilePath, lockFile, { spaces: 2 });
}

/**
 * Update README.md with new project name
 */
async function updateReadme(
  targetDir: string,
  projectName: string,
): Promise<void> {
  const readmePath = path.join(targetDir, "README.md");
  if (!(await fs.pathExists(readmePath))) {
    return;
  }

  let content = await fs.readFile(readmePath, "utf-8");

  content = content.replace(
    /^# (.+)$/m,
    `# ${projectName}`,
  );

  await fs.writeFile(readmePath, content);
}

export async function createProject(
  projectName: string,
  useCurrentDir: boolean = false,
): Promise<void> {
  const templateDir = path.join(__dirname, "../../template");
  let targetDir: string;

  if (useCurrentDir) {
    targetDir = process.cwd();
    // When using current dir, use the directory name as project name
    projectName = path.basename(targetDir);
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
    ignorePatterns.push("node_modules", ".wrangler");
    await fs.copy(templateDir, targetDir, {
      filter: (src: string) => {
        const relative = path.relative(templateDir, src);
        if (relative === "") return true;
        const negated = ignorePatterns.filter((p) => p.startsWith("!"));
        const excluded = ignorePatterns.filter(
          (p) => !p.startsWith("!") && relative.startsWith(p),
        );
        if (excluded.length > 0) {
          const allowed = negated.some((p) => relative === p.slice(1));
          if (allowed) return true;
          return false;
        }
        return true;
      },
      dereference: false,
    });
    spinner.succeed(chalk.green("Template files copied"));

    // Update configuration files
    spinner.start("Configuring package.json...");
    await updatePackageJson(targetDir, projectName);
    spinner.succeed(chalk.green("package.json configured"));

    spinner.start("Configuring package-lock.json...");
    await updatePackageLockJson(targetDir, projectName);
    spinner.succeed(chalk.green("package-lock.json configured"));

    spinner.start("Configuring wrangler.toml...");
    await updateWranglerToml(targetDir, projectName);
    spinner.succeed(chalk.green("wrangler.toml configured"));

    spinner.start("Configuring README.md...");
    await updateReadme(targetDir, projectName);
    spinner.succeed(chalk.green("README.md configured"));

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
    console.log(chalk.yellow("  ⚠️  Cloudflare Setup:"));
    console.log(
      chalk.white(
        `    1. Create D1 database: wrangler d1 create ${generateDbName(projectName)}`,
      ),
    );
    console.log(chalk.white("    2. Copy the database ID to wrangler.toml"));
    console.log(chalk.white("    3. Deploy: npm run deploy:cf"));
    console.log("");
    console.log(chalk.gray("  Happy coding! 🐟"));
    console.log("");
  } catch (error) {
    console.error(chalk.red("  ✖ Error creating project:"), error);
    process.exit(1);
  }
}

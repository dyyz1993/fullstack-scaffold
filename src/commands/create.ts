import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'fs-extra'
import chalk from 'chalk'
import ora from 'ora'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Template placeholder values that need to be replaced
const TEMPLATE_PROJECT_NAME = 'biomimic-todo-app'
const TEMPLATE_DB_NAME = 'biomimic-todo-db'

export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function validateProjectName(name: string): { valid: boolean; error?: string } {
  if (!name || !name.trim()) {
    return { valid: false, error: '项目名称不能为空' }
  }
  const trimmed = name.trim()
  if (trimmed.length > 214) {
    return { valid: false, error: '项目名称不能超过 214 个字符' }
  }
  if (/^\./.test(trimmed)) {
    return { valid: false, error: '项目名称不能以 . 开头' }
  }
  if (/^_/.test(trimmed)) {
    return { valid: false, error: '项目名称不能以 _ 开头' }
  }
  if (/[A-Z]/.test(trimmed)) {
    return { valid: false, error: '项目名称不能包含大写字母' }
  }
  if (/\s/.test(trimmed)) {
    return { valid: false, error: '项目名称不能包含空格' }
  }
  if (!/^[a-z0-9@/_-]+$/.test(trimmed)) {
    return { valid: false, error: '项目名称只能包含小写字母、数字、@、/、_、-' }
  }
  return { valid: true }
}

function parseGitignore(content: string): string[] {
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && !line.startsWith('!'))
    .map(pattern => pattern.replace(/\/$/, ''))
    .map(pattern => pattern.replace(/^\*\./, ''))
    .map(pattern => pattern.replace(/^\/+/, ''))
    .filter(pattern => !pattern.includes('*'))
}

/**
 * Generate a database name from project name
 * e.g., "my-project" -> "my-project-db"
 */
export function generateDbName(projectName: string): string {
  const sanitized = projectName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  const name = sanitized || 'app'
  return `${name}-db`
}

/**
 * Update wrangler.toml with new project name and database name
 */
async function updateWranglerToml(targetDir: string, projectName: string): Promise<void> {
  const wranglerPath = path.join(targetDir, 'wrangler.toml')
  if (!(await fs.pathExists(wranglerPath))) {
    return
  }

  let content = await fs.readFile(wranglerPath, 'utf-8')
  const dbName = generateDbName(projectName)

  // Replace worker name
  content = content.replace(
    new RegExp(`^name = "${escapeRegExp(TEMPLATE_PROJECT_NAME)}"`, 'm'),
    `name = "${projectName}"`
  )

  // Replace database name
  content = content.replace(
    new RegExp(`database_name = "${escapeRegExp(TEMPLATE_DB_NAME)}"`, 'g'),
    `database_name = "${dbName}"`
  )

  // Clear the database_id to force user to create a new one
  content = content.replace(
    /database_id = "[^"]+"/,
    `database_id = ""  # TODO: Run 'wrangler d1 create ${dbName}' and paste the ID here`
  )

  await fs.writeFile(wranglerPath, content)
}

/**
 * Update package.json with new project name
 */
async function updatePackageJson(targetDir: string, projectName: string): Promise<void> {
  const pkgJsonPath = path.join(targetDir, 'package.json')
  if (!(await fs.pathExists(pkgJsonPath))) {
    return
  }

  const pkgJson = await fs.readJson(pkgJsonPath)
  pkgJson.name = projectName

  // Remove bin field if it exists (CLI binary should not be published with new projects)
  if (pkgJson.bin) {
    delete pkgJson.bin
  }

  await fs.writeJson(pkgJsonPath, pkgJson, { spaces: 2 })
}

/**
 * Update package-lock.json with new project name
 */
async function updatePackageLockJson(targetDir: string, projectName: string): Promise<void> {
  const lockFilePath = path.join(targetDir, 'package-lock.json')
  if (!(await fs.pathExists(lockFilePath))) {
    return
  }

  const lockFile = await fs.readJson(lockFilePath)

  // Update root name
  if (lockFile.name === TEMPLATE_PROJECT_NAME) {
    lockFile.name = projectName
  }

  // Update packages[""].name if it exists
  if (lockFile.packages?.['']?.name === TEMPLATE_PROJECT_NAME) {
    lockFile.packages[''].name = projectName
  }

  await fs.writeJson(lockFilePath, lockFile, { spaces: 2 })
}

/**
 * Update README.md with new project name
 */
async function updateReadme(targetDir: string, projectName: string): Promise<void> {
  const readmePath = path.join(targetDir, 'README.md')
  if (!(await fs.pathExists(readmePath))) {
    return
  }

  let content = await fs.readFile(readmePath, 'utf-8')

  // Replace project name in title
  content = content.replace(
    new RegExp(`# ${escapeRegExp(TEMPLATE_PROJECT_NAME)}`, 'i'),
    `# ${projectName}`
  )

  await fs.writeFile(readmePath, content)
}

export async function createProject(
  projectName: string,
  useCurrentDir: boolean = false
): Promise<void> {
  const templateDir = path.join(__dirname, '../../template')
  let targetDir: string

  if (!useCurrentDir) {
    const validation = validateProjectName(projectName)
    if (!validation.valid) {
      console.error(chalk.red(`  ✖ ${validation.error}`))
      process.exit(1)
    }
  }

  if (useCurrentDir) {
    targetDir = process.cwd()
    // When using current dir, use the directory name as project name
    projectName = path.basename(targetDir)
  } else {
    targetDir = path.resolve(process.cwd(), projectName)
    if (await fs.pathExists(targetDir)) {
      console.error(chalk.red(`  ✖ 目录 ${projectName} 已存在`))
      process.exit(1)
    }
  }

  let createdTargetDir = false

  try {
    if (!useCurrentDir) {
      const spinner = ora('Creating project directory...').start()
      await fs.ensureDir(targetDir)
      createdTargetDir = true
      spinner.succeed(chalk.green('Project directory created'))
    }

    const spinner = ora('Copying template files...').start()
    const gitignorePath = path.join(templateDir, '.gitignore')
    let ignorePatterns: string[] = []
    if (await fs.pathExists(gitignorePath)) {
      const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8')
      ignorePatterns = parseGitignore(gitignoreContent)
    }
    ignorePatterns.push('node_modules', '.wrangler')
    await fs.copy(templateDir, targetDir, {
      filter: (src: string) => {
        const relative = path.relative(templateDir, src)
        if (relative === '') return true
        return !ignorePatterns.some(pattern => relative.startsWith(pattern))
      },
      dereference: false,
    })
    spinner.succeed(chalk.green('Template files copied'))

    // Update configuration files
    spinner.start('Configuring package.json...')
    await updatePackageJson(targetDir, projectName)
    spinner.succeed(chalk.green('package.json configured'))

    spinner.start('Configuring package-lock.json...')
    await updatePackageLockJson(targetDir, projectName)
    spinner.succeed(chalk.green('package-lock.json configured'))

    spinner.start('Configuring wrangler.toml...')
    await updateWranglerToml(targetDir, projectName)
    spinner.succeed(chalk.green('wrangler.toml configured'))

    spinner.start('Configuring README.md...')
    await updateReadme(targetDir, projectName)
    spinner.succeed(chalk.green('README.md configured'))

    console.log('')
    console.log(chalk.green('  ✓ Project created successfully!'))
    console.log('')
    console.log(chalk.cyan('  Next steps:'))
    if (!useCurrentDir) {
      console.log(chalk.white(`    cd ${projectName}`))
    }
    console.log(chalk.white('    npm install'))
    console.log(chalk.white('    npm run dev'))
    console.log('')
    console.log(chalk.yellow('  ⚠️  Cloudflare Setup:'))
    console.log(
      chalk.white(`    1. Create D1 database: wrangler d1 create ${generateDbName(projectName)}`)
    )
    console.log(chalk.white('    2. Copy the database ID to wrangler.toml'))
    console.log(chalk.white('    3. Deploy: npm run deploy:cf'))
    console.log('')
    console.log(chalk.gray('  Happy coding! 🐟'))
    console.log('')
  } catch (error) {
    console.error(chalk.red('  ✖ Error creating project:'), error)
    if (!useCurrentDir && createdTargetDir) {
      try {
        await fs.remove(targetDir)
        console.log(chalk.yellow('  ↩ 已清理不完整的项目目录'))
      } catch {
        console.error(chalk.red('  ✖ 清理失败，请手动删除:'), targetDir)
      }
    } else if (useCurrentDir) {
      console.log(chalk.yellow('  ⚠️  当前目录下可能存在不完整的文件，请手动检查'))
    }
    process.exit(1)
  }
}

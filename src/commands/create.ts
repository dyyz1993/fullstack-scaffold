import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'fs-extra'
import chalk from 'chalk'
import ora from 'ora'
import {
  loadManifests,
  loadPresets,
  resolvePreset,
  type ResolvedPreset,
} from '../generators/template-generator'
import { getExcludePatterns, getGeneratedFiles } from '../generators/file-filter'
import { generateRouteRegistry } from '../generators/route-registry'
import { generateClientApp } from '../generators/client-app'
import { generateClientNavigation } from '../generators/client-navigation'
import { generateAdminApp } from '../generators/admin-app'
import { generateDbSchemaBarrel } from '../generators/db-schema-barrel'
import { generateDbInit } from '../generators/db-init'
import { generateServerApp } from '../generators/server-app'
import { generateSharedModulesIndex } from '../generators/shared-modules-index'
import { generateSharedSchemasIndex } from '../generators/shared-schemas-index'
import { generateMiddlewareIndex } from '../generators/middleware-index'
import { generateAuthMiddleware } from '../generators/auth-middleware'
import { generateAuthUtils } from '../generators/auth-utils'
import { generateClientComponentsIndex } from '../generators/client-components-index'
import { generateCliModulesIndex } from '../generators/cli-modules-index'
import { filterPackageJson } from '../generators/package-json'
import { generateViteConfig } from '../generators/vite-config'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const TEMPLATE_PROJECT_NAME = 'biomimic-todo-app'
const TEMPLATE_DB_NAME = 'biomimic-todo-db'

export class ScaffoldError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ScaffoldError'
  }
}

function validateProjectName(name: string): void {
  if (!name || name.trim().length === 0) {
    throw new ScaffoldError('Project name cannot be empty')
  }
  const validNameRegex = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/
  if (!validNameRegex.test(name)) {
    throw new ScaffoldError(
      `Invalid project name "${name}". Use lowercase letters, numbers, hyphens, and underscores only.`
    )
  }
  if (name.length > 214) {
    throw new ScaffoldError('Project name must be 214 characters or less')
  }
  if (name.includes('..') || name.includes('/') || name.includes('\\')) {
    throw new ScaffoldError('Project name cannot contain path separators')
  }
}

function parseGitignore(content: string): string[] {
  const negatePatterns: string[] = []
  const includePatterns = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      if (line.startsWith('!')) {
        negatePatterns.push(line.slice(1))
        return null
      }
      return line
    })
    .filter((line): line is string => line !== null)
    .map(pattern => pattern.replace(/\/$/, ''))
    .map(pattern => pattern.replace(/^\*\./, ''))
    .map(pattern => pattern.replace(/^\/+/, ''))
    .filter(pattern => !pattern.includes('*'))
  return [...includePatterns, ...negatePatterns.map(p => `!${p}`)]
}

function generateDbName(projectName: string): string {
  const sanitized = projectName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return `${sanitized}-db`
}

async function updateWranglerToml(targetDir: string, projectName: string): Promise<void> {
  const wranglerPath = path.join(targetDir, 'wrangler.toml')
  if (!(await fs.pathExists(wranglerPath))) {
    return
  }

  let content = await fs.readFile(wranglerPath, 'utf-8')
  const dbName = generateDbName(projectName)

  content = content.replace(
    new RegExp(`^name = "${TEMPLATE_PROJECT_NAME}"`, 'm'),
    `name = "${projectName}"`
  )

  content = content.replace(
    new RegExp(`database_name = "${TEMPLATE_DB_NAME}"`, 'g'),
    `database_name = "${dbName}"`
  )

  content = content.replace(
    /database_id = "[^"]+"/,
    `database_id = ""  # TODO: Run 'wrangler d1 create ${dbName}' and paste the ID here`
  )

  await fs.writeFile(wranglerPath, content)
}

async function updatePackageJson(
  targetDir: string,
  projectName: string,
  resolved: ResolvedPreset
): Promise<void> {
  const pkgJsonPath = path.join(targetDir, 'package.json')
  if (!(await fs.pathExists(pkgJsonPath))) {
    return
  }

  let pkgJson = await fs.readJson(pkgJsonPath)

  pkgJson = filterPackageJson(pkgJson, resolved)

  pkgJson.name = projectName

  if (pkgJson.bin) {
    delete pkgJson.bin
  }

  await fs.writeJson(pkgJsonPath, pkgJson, { spaces: 2 })
}

async function updatePackageLockJson(targetDir: string, projectName: string): Promise<void> {
  const lockFilePath = path.join(targetDir, 'package-lock.json')
  if (!(await fs.pathExists(lockFilePath))) {
    return
  }

  const lockFile = await fs.readJson(lockFilePath)

  if (lockFile.name === TEMPLATE_PROJECT_NAME) {
    lockFile.name = projectName
  }

  if (lockFile.packages?.['']?.name === TEMPLATE_PROJECT_NAME) {
    lockFile.packages[''].name = projectName
  }

  await fs.writeJson(lockFilePath, lockFile, { spaces: 2 })
}

async function updateReadme(targetDir: string, projectName: string): Promise<void> {
  const readmePath = path.join(targetDir, 'README.md')
  if (!(await fs.pathExists(readmePath))) {
    return
  }

  let content = await fs.readFile(readmePath, 'utf-8')

  content = content.replace(/^# (.+)$/m, `# ${projectName}`)

  await fs.writeFile(readmePath, content)
}

export interface CreateOptions {
  projectName: string
  currentDir: boolean
  preset?: string
  outputDir?: string
  dryRun?: boolean
}

export async function createProject(options: CreateOptions): Promise<void>
export async function createProject(
  projectName: string,
  useCurrentDir?: boolean,
  preset?: string
): Promise<void>
export async function createProject(
  projectNameOrOptions: string | CreateOptions,
  useCurrentDir: boolean = false,
  preset?: string
): Promise<void> {
  let projectName: string
  let currentDir: boolean
  let presetId: string | undefined
  let outputDir: string | undefined
  let dryRun: boolean

  if (typeof projectNameOrOptions === 'string') {
    projectName = projectNameOrOptions
    currentDir = useCurrentDir
    presetId = preset
    dryRun = false
  } else {
    projectName = projectNameOrOptions.projectName
    currentDir = projectNameOrOptions.currentDir
    presetId = projectNameOrOptions.preset
    outputDir = projectNameOrOptions.outputDir
    dryRun = projectNameOrOptions.dryRun ?? false
  }

  if (!currentDir) {
    validateProjectName(projectName)
  }

  const templateDir = path.join(__dirname, '../../template')
  let targetDir: string

  if (currentDir) {
    targetDir = process.cwd()
    projectName = path.basename(targetDir)
  } else if (outputDir) {
    targetDir = path.resolve(outputDir)
    if (await fs.pathExists(targetDir)) {
      throw new ScaffoldError(`Directory ${outputDir} already exists`)
    }
  } else {
    targetDir = path.resolve(process.cwd(), projectName)
    if (await fs.pathExists(targetDir)) {
      throw new ScaffoldError(`Directory ${projectName} already exists`)
    }
  }

  try {
    const manifestSpinner = ora('Loading module manifests...').start()
    const allManifests = await loadManifests(templateDir)
    const presets = await loadPresets(templateDir)

    const selectedPresetId = presetId || 'fullstack-admin'
    const selectedPreset = presets.find(p => p.id === selectedPresetId)
    if (!selectedPreset) {
      throw new ScaffoldError(
        `Unknown preset: ${selectedPresetId}. Available: ${presets.map(p => p.id).join(', ')}`
      )
    }

    const resolved = resolvePreset(selectedPreset, allManifests)
    manifestSpinner.succeed(
      chalk.green(`Using preset: ${selectedPreset.name} (${resolved.modules.size} modules)`)
    )

    if (dryRun) {
      const resolvedModuleNames = [...resolved.modules.keys()]
      const generatedFiles = getGeneratedFiles(resolved)

      console.log('')
      console.log(chalk.blue('📋 Dry Run - Files that would be generated:\n'))
      for (const file of generatedFiles) {
        console.log(`  ${chalk.green('✓')} ${file}`)
      }

      const gitignorePath = path.join(templateDir, '.gitignore')
      let ignorePatterns: string[] = []
      if (await fs.pathExists(gitignorePath)) {
        const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8')
        ignorePatterns = parseGitignore(gitignoreContent)
      }
      ignorePatterns.push('node_modules', '.wrangler')
      const excludePatterns = getExcludePatterns(resolved, allManifests)

      let templateFileCount = 0
      const templateFiles = await fs.readdir(templateDir, { recursive: true })
      for (const file of templateFiles) {
        const relative = String(file)
        if (!relative) continue
        const negated = ignorePatterns.filter((p: string) => p.startsWith('!'))
        const gitIgnored = ignorePatterns.filter(
          (p: string) => !p.startsWith('!') && relative.startsWith(p)
        )
        if (gitIgnored.length > 0) {
          const allowed = negated.some((p: string) => relative === p.slice(1))
          if (!allowed) continue
        }
        const normalizedRelative = relative.replace(/\\/g, '/')
        let excluded = false
        for (const pattern of excludePatterns) {
          const normalizedPattern = pattern.replace(/\\/g, '/')
          if (
            normalizedRelative === normalizedPattern ||
            normalizedRelative.startsWith(normalizedPattern + '/')
          ) {
            excluded = true
            break
          }
        }
        if (!excluded) templateFileCount++
      }

      console.log('')
      console.log(chalk.blue('📁 Template files that would be copied:\n'))
      console.log(`  ${chalk.green('✓')} ${templateFileCount} template files`)
      console.log('')
      console.log(chalk.yellow(`  Total generated files: ${generatedFiles.length}`))
      console.log(chalk.yellow(`  Preset: ${selectedPreset.name}`))
      console.log(chalk.yellow(`  Modules: ${resolvedModuleNames.join(', ')}`))
      console.log('')
      return
    }

    if (!currentDir) {
      const dirSpinner = ora('Creating project directory...').start()
      await fs.ensureDir(targetDir)
      dirSpinner.succeed(chalk.green('Project directory created'))
    }

    const copySpinner = ora('Copying template files...').start()
    const gitignorePath = path.join(templateDir, '.gitignore')
    let ignorePatterns: string[] = []
    if (await fs.pathExists(gitignorePath)) {
      const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8')
      ignorePatterns = parseGitignore(gitignoreContent)
    }
    ignorePatterns.push('node_modules', '.wrangler')

    const excludePatterns = getExcludePatterns(resolved, allManifests)

    await fs.copy(templateDir, targetDir, {
      filter: (src: string) => {
        const relative = path.relative(templateDir, src)
        if (relative === '') return true

        const negated = ignorePatterns.filter(p => p.startsWith('!'))
        const gitIgnored = ignorePatterns.filter(p => !p.startsWith('!') && relative.startsWith(p))
        if (gitIgnored.length > 0) {
          const allowed = negated.some(p => relative === p.slice(1))
          if (!allowed) return false
        }

        const normalizedRelative = relative.replace(/\\/g, '/')
        for (const pattern of excludePatterns) {
          const normalizedPattern = pattern.replace(/\\/g, '/')
          if (
            normalizedRelative === normalizedPattern ||
            normalizedRelative.startsWith(normalizedPattern + '/')
          ) {
            return false
          }
        }

        return true
      },
      dereference: false,
    })
    copySpinner.succeed(chalk.green('Template files copied'))

    const genSpinner = ora('Generating module-specific files...').start()

    const routeRegistryContent = generateRouteRegistry(resolved)
    await fs.writeFile(path.join(targetDir, 'src/server/route-registry.ts'), routeRegistryContent)

    const dbSchemaContent = generateDbSchemaBarrel(resolved)
    await fs.writeFile(path.join(targetDir, 'src/server/db/schema/index.ts'), dbSchemaContent)

    const clientAppContent = generateClientApp(resolved)
    await fs.writeFile(path.join(targetDir, 'src/client/App.tsx'), clientAppContent)

    const clientNavContent = generateClientNavigation(resolved)
    await fs.writeFile(
      path.join(targetDir, 'src/client/components/Navigation.tsx'),
      clientNavContent
    )

    if (resolved.modules.has('admin')) {
      const adminAppContent = generateAdminApp(resolved)
      if (adminAppContent) {
        await fs.ensureDir(path.join(targetDir, 'src/admin'))
        await fs.writeFile(path.join(targetDir, 'src/admin/App.tsx'), adminAppContent)
      }
    }

    const serverAppContent = generateServerApp(resolved)
    await fs.writeFile(path.join(targetDir, 'src/server/app.ts'), serverAppContent)

    const generatedFiles = getGeneratedFiles(resolved)
    if (generatedFiles.includes('src/server/db/init.ts')) {
      const dbInitContent = generateDbInit(resolved)
      await fs.writeFile(path.join(targetDir, 'src/server/db/init.ts'), dbInitContent)
    }

    const sharedModulesContent = generateSharedModulesIndex(resolved)
    await fs.writeFile(path.join(targetDir, 'src/shared/modules/index.ts'), sharedModulesContent)

    const sharedSchemasContent = generateSharedSchemasIndex(resolved)
    await fs.writeFile(path.join(targetDir, 'src/shared/schemas/index.ts'), sharedSchemasContent)

    const middlewareIndexContent = generateMiddlewareIndex(resolved)
    await fs.writeFile(
      path.join(targetDir, 'src/server/middleware/index.ts'),
      middlewareIndexContent
    )

    if (generatedFiles.includes('src/server/middleware/auth.ts')) {
      const authMiddlewareContent = generateAuthMiddleware(resolved)
      await fs.writeFile(
        path.join(targetDir, 'src/server/middleware/auth.ts'),
        authMiddlewareContent
      )
    }

    if (generatedFiles.includes('src/server/utils/auth.ts')) {
      const authUtilsContent = generateAuthUtils(resolved)
      await fs.writeFile(path.join(targetDir, 'src/server/utils/auth.ts'), authUtilsContent)
    }

    const clientComponentsContent = generateClientComponentsIndex(resolved)
    await fs.writeFile(
      path.join(targetDir, 'src/client/components/index.ts'),
      clientComponentsContent
    )

    if (resolved.modules.has('admin')) {
      const cliModulesContent = generateCliModulesIndex(resolved)
      await fs.writeFile(path.join(targetDir, 'src/cli/modules/index.ts'), cliModulesContent)
    }

    if (generatedFiles.includes('vite.config.ts')) {
      const viteConfigContent = generateViteConfig(resolved, templateDir)
      await fs.writeFile(path.join(targetDir, 'vite.config.ts'), viteConfigContent)
    }

    genSpinner.succeed(chalk.green('Module-specific files generated'))

    const pkgSpinner = ora('Configuring package.json...').start()
    await updatePackageJson(targetDir, projectName, resolved)
    pkgSpinner.succeed(chalk.green('package.json configured'))

    const lockSpinner = ora('Configuring package-lock.json...').start()
    await updatePackageLockJson(targetDir, projectName)
    lockSpinner.succeed(chalk.green('package-lock.json configured'))

    const wranglerSpinner = ora('Configuring wrangler.toml...').start()
    await updateWranglerToml(targetDir, projectName)
    wranglerSpinner.succeed(chalk.green('wrangler.toml configured'))

    const readmeSpinner = ora('Configuring README.md...').start()
    await updateReadme(targetDir, projectName)
    readmeSpinner.succeed(chalk.green('README.md configured'))

    console.log('')
    console.log(chalk.green('  ✓ Project created successfully!'))
    console.log(chalk.gray(`   Preset: ${selectedPreset.name}`))
    console.log(chalk.gray(`   Modules: ${[...resolved.modules.keys()].join(', ')}`))
    console.log('')
    console.log(chalk.cyan('  Next steps:'))
    if (!currentDir && !outputDir) {
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
    if (error instanceof ScaffoldError) throw error
    throw new ScaffoldError(`Error creating project: ${error}`)
  }
}

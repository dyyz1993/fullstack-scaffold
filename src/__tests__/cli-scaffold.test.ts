import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const PROJECT_ROOT = path.resolve(import.meta.dirname, '../..')
const CLI_ENTRY = path.join(PROJECT_ROOT, 'src/index.ts')

const tempDirs: string[] = []

function createTempDir(prefix = 'cli-scaffold-'): string {
  const dir = path.join(os.tmpdir(), `${prefix}${randomUUID()}`)
  fs.mkdirSync(dir, { recursive: true })
  tempDirs.push(dir)
  return dir
}

function runCli(
  args: string[],
  cwd?: string,
): { stdout: string; stderr: string; status: number | null } {
  try {
    const stdout = execSync(`npx tsx "${CLI_ENTRY}" ${args.join(' ')}`, {
      cwd: cwd ?? os.tmpdir(),
      encoding: 'utf-8',
      timeout: 60_000,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    return { stdout, stderr: '', status: 0 }
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; status?: number }
    return {
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? '',
      status: e.status ?? 1,
    }
  }
}

afterAll(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe('CLI Scaffold', () => {
  test('shows help with --help flag', () => {
    const result = runCli(['--help'])

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('create-biomimic-app')
    expect(result.stdout).toContain('project-name')
    expect(result.stdout).toContain('--current-dir')
  })

  test('creates project with template files', () => {
    const parentDir = createTempDir()
    const projectDir = path.join(parentDir, 'test-project')

    const result = runCli(['test-project'], parentDir)

    expect(result.status).toBe(0)
    expect(fs.existsSync(path.join(projectDir, 'package.json'))).toBe(true)
    expect(fs.existsSync(path.join(projectDir, 'src'))).toBe(true)
    expect(fs.existsSync(path.join(projectDir, 'node_modules'))).toBe(false)
    expect(fs.existsSync(path.join(projectDir, '.wrangler'))).toBe(false)
    expect(fs.existsSync(path.join(projectDir, 'dist'))).toBe(false)
    expect(fs.existsSync(path.join(projectDir, 'coverage'))).toBe(false)
  })

  test('replaces project name in package.json', () => {
    const parentDir = createTempDir()
    const projectName = 'my-awesome-project'

    runCli([projectName], parentDir)

    const pkgJsonPath = path.join(parentDir, projectName, 'package.json')
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'))

    expect(pkgJson.name).toBe(projectName)
    expect(pkgJson.name).not.toBe('biomimic-todo-app')
    expect(pkgJson.bin).toBeUndefined()
  })

  test('errors when target directory already exists', () => {
    const parentDir = createTempDir()
    fs.mkdirSync(path.join(parentDir, 'existing-dir'), { recursive: true })

    const result = runCli(['existing-dir'], parentDir)

    expect(result.status).not.toBe(0)
  })

  test('does not copy .env files', () => {
    const parentDir = createTempDir()
    runCli(['env-test'], parentDir)
    const projectDir = path.join(parentDir, 'env-test')

    expect(fs.existsSync(path.join(projectDir, '.env'))).toBe(false)
    expect(fs.existsSync(path.join(projectDir, '.env.local'))).toBe(false)
    expect(fs.existsSync(path.join(projectDir, '.env.production'))).toBe(false)
    expect(fs.existsSync(path.join(projectDir, '.env.test'))).toBe(false)
  })

  test('copies .env.example', () => {
    const parentDir = createTempDir()
    runCli(['env-example-test'], parentDir)
    const projectDir = path.join(parentDir, 'env-example-test')

    expect(fs.existsSync(path.join(projectDir, '.env.example'))).toBe(true)
  })

  test('copies essential config files', () => {
    const parentDir = createTempDir()
    runCli(['config-test'], parentDir)
    const projectDir = path.join(parentDir, 'config-test')

    expect(fs.existsSync(path.join(projectDir, 'tsconfig.json'))).toBe(true)
    expect(fs.existsSync(path.join(projectDir, 'vite.config.ts'))).toBe(true)
    expect(fs.existsSync(path.join(projectDir, 'wrangler.toml'))).toBe(true)
    expect(fs.existsSync(path.join(projectDir, 'index.html'))).toBe(true)
    expect(fs.existsSync(path.join(projectDir, 'README.md'))).toBe(true)
  })

  test('replaces wrangler.toml values', () => {
    const parentDir = createTempDir()
    runCli(['wrangler-test'], parentDir)
    const projectDir = path.join(parentDir, 'wrangler-test')

    const wranglerPath = path.join(projectDir, 'wrangler.toml')
    const content = fs.readFileSync(wranglerPath, 'utf-8')

    expect(content).not.toContain('name = "biomimic-todo-app"')
    expect(content).toContain('name = "wrangler-test"')
    expect(content).toContain('database_name = "wrangler-test-db"')
    expect(content).toMatch(/database_id = ""/)
    expect(content).not.toContain('e4253b7e-be6b-4ca7-bf19-7c3725f8e32c')
  })

  test('replaces README.md project name', () => {
    const parentDir = createTempDir()
    runCli(['readme-test'], parentDir)
    const projectDir = path.join(parentDir, 'readme-test')

    const readme = fs.readFileSync(path.join(projectDir, 'README.md'), 'utf-8')
    expect(readme).not.toMatch(/^# biomimic-todo-app/m)
    expect(readme).toContain('readme-test')
  })

  test('replaces project name in package-lock.json', () => {
    const parentDir = createTempDir()
    runCli(['lockfile-test'], parentDir)
    const projectDir = path.join(parentDir, 'lockfile-test')

    const lockPath = path.join(projectDir, 'package-lock.json')
    if (fs.existsSync(lockPath)) {
      const lockJson = JSON.parse(fs.readFileSync(lockPath, 'utf-8'))
      expect(lockJson.name).toBe('lockfile-test')
      if (lockJson.packages?.['']?.name) {
        expect(lockJson.packages[''].name).toBe('lockfile-test')
      }
    }
  })

  test('sanitizes special characters in database name', () => {
    const parentDir = createTempDir()
    runCli(['My_Special.Project'], parentDir)
    const projectDir = path.join(parentDir, 'My_Special.Project')

    const wranglerPath = path.join(projectDir, 'wrangler.toml')
    const content = fs.readFileSync(wranglerPath, 'utf-8')
    expect(content).toContain('database_name = "my-special-project-db"')
  })

  test('default project name is my-biomimic-app', () => {
    const parentDir = createTempDir()
    const defaultDir = path.join(parentDir, 'my-biomimic-app')

    runCli([], parentDir)

    expect(fs.existsSync(defaultDir)).toBe(true)
    const pkgJson = JSON.parse(
      fs.readFileSync(path.join(defaultDir, 'package.json'), 'utf-8'),
    )
    expect(pkgJson.name).toBe('my-biomimic-app')
  })
})

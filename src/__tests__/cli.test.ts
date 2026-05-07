import { execSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const PROJECT_ROOT = path.resolve(import.meta.dirname, '../..')
const CLI_PATH = path.join(PROJECT_ROOT, 'src/index.ts')
const TSX_BIN = path.join(PROJECT_ROOT, 'node_modules/.bin/tsx')

function tmpDir(prefix = 'fullstack-scaffold-test-'): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix))
}

function runCli(
  args: string[],
  cwd?: string
): { stdout: string; stderr: string; status: number | null } {
  try {
    const stdout = execSync(`"${TSX_BIN}" "${CLI_PATH}" ${args.join(' ')}`, {
      cwd: cwd ?? os.tmpdir(),
      encoding: 'utf-8',
      timeout: 30_000,
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

describe('CLI', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = tmpDir()
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  test('shows help text with --help', () => {
    const result = runCli(['--help'])
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('create-fullstack-scaffold')
    expect(result.stdout).toContain('project-name')
    expect(result.stdout).toContain('--current-dir')
    expect(result.stdout).toContain('--preset')
  })
})

describe('CLI Scaffold - core flow', () => {
  let tempDir: string
  let projectDir: string

  beforeEach(() => {
    tempDir = tmpDir()
    projectDir = path.join(tempDir, 'test-project')
    const result = runCli(['test-project'], tempDir)
    expect(result.status).toBe(0)
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  test('creates project directory with correct files', () => {
    expect(fs.existsSync(projectDir)).toBe(true)
    expect(fs.existsSync(path.join(projectDir, 'package.json'))).toBe(true)
    expect(fs.existsSync(path.join(projectDir, 'src'))).toBe(true)
  })

  test('replaces project name in package.json', () => {
    const pkgJson = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf-8'))
    expect(pkgJson.name).toBe('test-project')
    expect(pkgJson.name).not.toBe('biomimic-todo-app')
    expect(pkgJson.bin).toBeUndefined()
  })

  test('replaces project name in package-lock.json', () => {
    const lockPath = path.join(projectDir, 'package-lock.json')
    if (fs.existsSync(lockPath)) {
      const lockJson = JSON.parse(fs.readFileSync(lockPath, 'utf-8'))
      expect(lockJson.name).toBe('test-project')
      if (lockJson.packages?.['']?.name) {
        expect(lockJson.packages[''].name).toBe('test-project')
      }
    }
  })

  test('replaces wrangler.toml values', () => {
    const wranglerPath = path.join(projectDir, 'wrangler.toml')
    if (fs.existsSync(wranglerPath)) {
      const content = fs.readFileSync(wranglerPath, 'utf-8')
      expect(content).not.toContain('name = "biomimic-todo-app"')
      expect(content).toContain('test-project')
      expect(content).toContain('test-project-db')
      expect(content).toMatch(/database_id = ""/)
      expect(content).not.toContain('e4253b7e-be6b-4ca7-bf19-7c3725f8e32c')
    }
  })

  test('replaces README.md project name', () => {
    const readmePath = path.join(projectDir, 'README.md')
    if (fs.existsSync(readmePath)) {
      const content = fs.readFileSync(readmePath, 'utf-8')
      expect(content).not.toMatch(/^# biomimic-todo-app/m)
      expect(content).toContain('test-project')
    }
  })

  test('copies .env.example but not other .env files', () => {
    expect(fs.existsSync(path.join(projectDir, '.env.example'))).toBe(true)
    expect(fs.existsSync(path.join(projectDir, '.env'))).toBe(false)
    expect(fs.existsSync(path.join(projectDir, '.env.local'))).toBe(false)
    expect(fs.existsSync(path.join(projectDir, '.env.production'))).toBe(false)
    expect(fs.existsSync(path.join(projectDir, '.env.test'))).toBe(false)
  })

  test('creates essential config files', () => {
    expect(fs.existsSync(path.join(projectDir, 'tsconfig.json'))).toBe(true)
    expect(fs.existsSync(path.join(projectDir, 'vite.config.ts'))).toBe(true)
    expect(fs.existsSync(path.join(projectDir, 'wrangler.toml'))).toBe(true)
    expect(fs.existsSync(path.join(projectDir, 'index.html'))).toBe(true)
    expect(fs.existsSync(path.join(projectDir, 'README.md'))).toBe(true)
  })

  test('creates correct src directory structure', () => {
    expect(fs.existsSync(path.join(projectDir, 'src'))).toBe(true)
    expect(fs.statSync(path.join(projectDir, 'src')).isDirectory()).toBe(true)
    expect(fs.existsSync(path.join(projectDir, 'src/client'))).toBe(true)
    expect(fs.existsSync(path.join(projectDir, 'src/server'))).toBe(true)
    expect(fs.existsSync(path.join(projectDir, 'src/shared'))).toBe(true)
  })
})

describe('CLI Scaffold - file filtering', () => {
  let tempDir: string
  let projectDir: string

  beforeEach(() => {
    tempDir = tmpDir()
    projectDir = path.join(tempDir, 'filter-test')
    runCli(['filter-test'], tempDir)
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  test('excludes node_modules from copy', () => {
    expect(fs.existsSync(path.join(projectDir, 'node_modules'))).toBe(false)
  })

  test('excludes .wrangler from copy', () => {
    expect(fs.existsSync(path.join(projectDir, '.wrangler'))).toBe(false)
  })

  test('excludes dist from copy', () => {
    expect(fs.existsSync(path.join(projectDir, 'dist'))).toBe(false)
  })

  test('excludes coverage from copy', () => {
    expect(fs.existsSync(path.join(projectDir, 'coverage'))).toBe(false)
  })

  test('excludes logs from copy', () => {
    expect(fs.existsSync(path.join(projectDir, 'logs'))).toBe(false)
  })

  test('excludes data directory from copy', () => {
    expect(fs.existsSync(path.join(projectDir, 'data'))).toBe(false)
  })
})

describe('CLI Scaffold - edge cases', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = tmpDir()
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  test('handles existing directory with error', () => {
    fs.mkdirSync(path.join(tempDir, 'existing-dir'), { recursive: true })
    const result = runCli(['existing-dir'], tempDir)
    expect(result.status).not.toBe(0)
  })

  test('--current-dir flag creates in current directory', () => {
    const result = runCli(['--current-dir'], tempDir)
    expect(result.status).toBe(0)
    expect(fs.existsSync(path.join(tempDir, 'package.json'))).toBe(true)
  })

  test('default project name is my-fullstack-app when no name provided', () => {
    const defaultDir = path.join(tempDir, 'my-fullstack-app')
    const result = runCli([], tempDir)
    expect(result.status).toBe(0)
    expect(fs.existsSync(defaultDir)).toBe(true)
    const pkgJson = JSON.parse(fs.readFileSync(path.join(defaultDir, 'package.json'), 'utf-8'))
    expect(pkgJson.name).toBe('my-fullstack-app')
  })

  test('rejects invalid project name with special characters', () => {
    const result = runCli(['My_Special.Project'], tempDir)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('Invalid project name')
  })
})

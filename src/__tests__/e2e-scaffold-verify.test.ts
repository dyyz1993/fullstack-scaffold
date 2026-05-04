import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const PROJECT_ROOT = path.resolve(import.meta.dirname, '../..')
const CLI_ENTRY = path.join(PROJECT_ROOT, 'src/index.ts')
const tmpDir = path.join(os.tmpdir(), `e2e-scaffold-${randomUUID()}`)
const projectName = 'e2e-test-app'
const projectPath = path.join(tmpDir, projectName)

function run(cmd: string, cwd: string, timeout = 120_000): string {
  return execSync(cmd, {
    cwd,
    encoding: 'utf-8',
    timeout,
    stdio: 'pipe',
    maxBuffer: 50 * 1024 * 1024,
  })
}

describe('E2E: Scaffold → Install → Verify', () => {
  afterAll(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  test('step 1: scaffolds a new project', () => {
    fs.mkdirSync(tmpDir, { recursive: true })
    run(`npx tsx "${CLI_ENTRY}" ${projectName}`, tmpDir, 60_000)
    expect(fs.existsSync(projectPath)).toBe(true)
    expect(fs.existsSync(path.join(projectPath, 'package.json'))).toBe(true)
    expect(fs.existsSync(path.join(projectPath, 'tsconfig.json'))).toBe(true)
    expect(fs.existsSync(path.join(projectPath, 'src'))).toBe(true)
  })

  test('step 2: installs dependencies', () => {
    expect(fs.existsSync(projectPath)).toBe(true)
    run('npm install', projectPath, 300_000)
    expect(fs.existsSync(path.join(projectPath, 'node_modules'))).toBe(true)
  })

  test('step 3: type-check passes', () => {
    run('npx tsc --noEmit', projectPath, 120_000)
  })

  test('step 4: unit tests pass', () => {
    const output = run('npx vitest run 2>&1', projectPath, 180_000)
    expect(output).not.toContain('FAIL')
    // eslint-disable-next-line no-control-regex
    const cleaned = output.replace(/\x1b\[[0-9;]*m/g, '')
    expect(cleaned).toMatch(/Tests\s+\d+ passed/)
  })

  test('step 5: project builds successfully', () => {
    const pkgJson = JSON.parse(
      fs.readFileSync(path.join(projectPath, 'package.json'), 'utf-8'),
    )
    if (pkgJson.scripts?.build) {
      run('npm run build', projectPath, 120_000)
      expect(fs.existsSync(path.join(projectPath, 'dist'))).toBe(true)
    }
  })
})

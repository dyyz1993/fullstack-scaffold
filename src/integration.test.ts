import { describe, it, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs-extra'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { generateProject } from './commands/generator.js'
import type { ProjectConfig } from './types.js'

const TEMP_DIRS = [
  '/tmp/int-test-s1',
  '/tmp/int-test-s2',
  '/tmp/int-test-s3',
  '/tmp/int-test-s4',
  '/tmp/int-test-s5',
]

after(async () => {
  for (const dir of TEMP_DIRS) {
    await fs.remove(dir)
  }
})

async function prepareAndGenerate(config: ProjectConfig): Promise<string> {
  const targetDir = path.resolve(config.name)
  await fs.remove(targetDir)
  await generateProject(config)
  return targetDir
}

function runTsc(cwd: string): void {
  execSync('npm install', { cwd, stdio: 'pipe', timeout: 120_000 })
  execSync('npx tsc --noEmit', { cwd, stdio: 'pipe', timeout: 120_000 })
}

describe('integration: pure frontend project', () => {
  it('should generate frontend-only project and pass TSC', async () => {
    const config: ProjectConfig = {
      name: '/tmp/int-test-s1',
      channels: ['web'],
      backend: false,
      modules: [],
      deploy: 'node',
      database: 'sqlite',
    }
    const dir = await prepareAndGenerate(config)

    assert.ok(await fs.pathExists(path.join(dir, 'src/client')), 'src/client/ should exist')
    assert.ok(!(await fs.pathExists(path.join(dir, 'src/server'))), 'src/server/ should not exist')
    assert.ok(
      !(await fs.pathExists(path.join(dir, 'docker-compose.yml'))),
      'docker-compose.yml should not exist'
    )
    assert.ok(!(await fs.pathExists(path.join(dir, 'Dockerfile'))), 'Dockerfile should not exist')

    runTsc(dir)
  })
})

describe('integration: fullstack web project', () => {
  it('should generate fullstack project and pass TSC', async () => {
    const config: ProjectConfig = {
      name: '/tmp/int-test-s2',
      channels: ['web'],
      backend: true,
      modules: ['todos'],
      deploy: 'node',
      database: 'sqlite',
    }
    const dir = await prepareAndGenerate(config)

    assert.ok(await fs.pathExists(path.join(dir, 'src/client')), 'src/client/ should exist')
    assert.ok(await fs.pathExists(path.join(dir, 'src/server')), 'src/server/ should exist')

    runTsc(dir)
  })
})

describe('integration: mysql project drizzle config', () => {
  it('should use mysql dialect in drizzle config', async () => {
    const config: ProjectConfig = {
      name: '/tmp/int-test-s3',
      channels: ['web'],
      backend: true,
      modules: ['todos'],
      deploy: 'node',
      database: 'mysql',
    }
    const dir = await prepareAndGenerate(config)

    const drizzleContent = await fs.readFile(path.join(dir, 'drizzle.config.ts'), 'utf-8')
    assert.ok(drizzleContent.includes("dialect: 'mysql'"), 'should contain dialect: mysql')
    assert.ok(!drizzleContent.includes('sqlitePath'), 'should not contain sqlitePath')

    const pkg = await fs.readJson(path.join(dir, 'package.json'))
    assert.ok('mysql2' in pkg.dependencies, 'package.json should contain mysql2 dependency')
  })
})

describe('integration: cloudflare project', () => {
  it('should generate wrangler.toml and remove docker-compose', async () => {
    const config: ProjectConfig = {
      name: '/tmp/int-test-s4',
      channels: ['web'],
      backend: true,
      modules: ['todos'],
      deploy: 'cloudflare',
      database: 'd1',
    }
    const dir = await prepareAndGenerate(config)

    const wranglerPath = path.join(dir, 'wrangler.toml')
    assert.ok(await fs.pathExists(wranglerPath), 'wrangler.toml should exist')

    const wranglerContent = await fs.readFile(wranglerPath, 'utf-8')
    assert.ok(
      wranglerContent.includes('name = "int-test-s4"'),
      'wrangler name should be int-test-s4 without path prefix'
    )

    assert.ok(
      !(await fs.pathExists(path.join(dir, 'docker-compose.yml'))),
      'docker-compose.yml should not exist'
    )
  })
})

describe('integration: API-only project (no channels)', () => {
  it('should generate server-only project and pass TSC', async () => {
    const config: ProjectConfig = {
      name: '/tmp/int-test-s5',
      channels: [],
      backend: true,
      modules: ['todos'],
      deploy: 'node',
      database: 'sqlite',
    }
    const dir = await prepareAndGenerate(config)

    assert.ok(!(await fs.pathExists(path.join(dir, 'src/client'))), 'src/client/ should not exist')
    assert.ok(await fs.pathExists(path.join(dir, 'src/server')), 'src/server/ should exist')

    runTsc(dir)
  })
})

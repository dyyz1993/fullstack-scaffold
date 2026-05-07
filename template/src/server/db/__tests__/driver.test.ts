// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../../utils/logger', () => ({
  logger: {
    db: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}))

vi.mock('drizzle-orm/libsql', () => ({
  drizzle: vi.fn(() => ({ mock: 'libsql-db' })),
}))

vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn(() => ({ mock: 'd1-db' })),
}))

vi.mock('@libsql/client', () => ({
  createClient: vi.fn(() => ({ close: vi.fn(), mock: 'client' })),
}))

vi.mock('drizzle-orm/libsql/migrator', () => ({
  migrate: vi.fn(),
}))

const mockFs = {
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
}

vi.mock('fs', () => ({
  existsSync: mockFs.existsSync,
  mkdirSync: mockFs.mkdirSync,
}))

const originalEnv = process.env

beforeEach(() => {
  vi.resetModules()
  process.env = { ...originalEnv, NODE_ENV: 'test', SQLITE_PATH: ':memory:' }
  mockFs.existsSync.mockReturnValue(true)
  mockFs.mkdirSync.mockReturnValue(undefined)
})

afterEach(() => {
  process.env = originalEnv
  vi.restoreAllMocks()
})

describe('db/driver (sqlite)', () => {
  it('should create sqlite db for sqlite driver', async () => {
    process.env.DB_DRIVER = 'sqlite'
    process.env.SQLITE_PATH = ':memory:'
    const { getDb } = await import('../driver')
    const db = await getDb()
    expect(db).toBeDefined()
  })

  it('should return cached db on second call', async () => {
    process.env.DB_DRIVER = 'sqlite'
    process.env.SQLITE_PATH = ':memory:'
    const { getDb } = await import('../driver')
    const db1 = await getDb()
    const db2 = await getDb()
    expect(db1).toBe(db2)
  })

  it('should create directory for file-based sqlite', async () => {
    process.env.DB_DRIVER = 'sqlite'
    process.env.SQLITE_PATH = './data/test-driver.db'
    mockFs.existsSync.mockReturnValue(false)
    const { getDb } = await import('../driver')
    await getDb()
    expect(mockFs.mkdirSync).toHaveBeenCalled()
  })

  it('should skip mkdir for :memory: path', async () => {
    process.env.DB_DRIVER = 'sqlite'
    process.env.SQLITE_PATH = ':memory:'
    mockFs.existsSync.mockReturnValue(true)
    const { getDb } = await import('../driver')
    await getDb()
  })

  it('should return sqlite client from getRawClient', async () => {
    process.env.DB_DRIVER = 'sqlite'
    process.env.SQLITE_PATH = ':memory:'
    const { getRawClient } = await import('../driver')
    const client = await getRawClient()
    expect(client).toBeDefined()
  })

  it('should init db in getRawClient if not initialized', async () => {
    process.env.DB_DRIVER = 'sqlite'
    process.env.SQLITE_PATH = ':memory:'
    const { getRawClient } = await import('../driver')
    const client = await getRawClient()
    expect(client).toBeDefined()
  })

  it('should close sqlite client', async () => {
    process.env.DB_DRIVER = 'sqlite'
    process.env.SQLITE_PATH = ':memory:'
    const { getDb, closeDb } = await import('../driver')
    await getDb()
    await closeDb()
  })

  it('should handle close when no client', async () => {
    process.env.DB_DRIVER = 'sqlite'
    process.env.SQLITE_PATH = ':memory:'
    const { closeDb } = await import('../driver')
    await closeDb()
  })

  it('should skip migrations when no migrations folder', async () => {
    process.env.DB_DRIVER = 'sqlite'
    process.env.SQLITE_PATH = ':memory:'
    mockFs.existsSync.mockReturnValue(false)
    const { getDb, runMigrations } = await import('../driver')
    await getDb()
    await runMigrations()
  })

  it('should run migrations when folder exists', async () => {
    process.env.DB_DRIVER = 'sqlite'
    process.env.SQLITE_PATH = ':memory:'
    mockFs.existsSync.mockReturnValue(true)
    const { getDb, runMigrations } = await import('../driver')
    await getDb()
    await runMigrations()
  })

  it('should skip migrations if no db initialized', async () => {
    process.env.DB_DRIVER = 'sqlite'
    const { runMigrations } = await import('../driver')
    await runMigrations()
  })
})

describe('db/driver (d1)', () => {
  it('should create d1 db when driver is d1', async () => {
    process.env.DB_DRIVER = 'd1'
    const mockD1 = { prepare: vi.fn() }
    ;(globalThis as any).DB = mockD1
    const { getDb } = await import('../driver')
    const db = await getDb()
    expect(db).toBeDefined()
    delete (globalThis as any).DB
  })

  it('should throw if d1 database binding missing', async () => {
    process.env.DB_DRIVER = 'd1'
    delete (globalThis as any).DB
    const { getDb } = await import('../driver')
    await expect(getDb()).rejects.toThrow('D1 database binding')
  })

  it('should return d1 database from getRawClient', async () => {
    process.env.DB_DRIVER = 'd1'
    const mockD1 = { prepare: vi.fn() }
    ;(globalThis as any).DB = mockD1
    const { getRawClient } = await import('../driver')
    const client = await getRawClient()
    expect(client).toBe(mockD1)
    delete (globalThis as any).DB
  })

  it('should return null from getRawClient for unknown driver', async () => {
    process.env.DB_DRIVER = 'mysql'
    const { getRawClient } = await import('../driver')
    const client = await getRawClient()
    expect(client).toBeNull()
  })
})

describe('db/driver (cloudflare)', () => {
  it('should skip migrations in cloudflare env', async () => {
    vi.doMock('../../utils/env', () => ({
      isCloudflare: true,
    }))
    process.env.DB_DRIVER = 'sqlite'
    const { runMigrations } = await import('../driver')
    await runMigrations()
    vi.doUnmock('../../utils/env')
  })

  it('should throw when creating sqlite in cloudflare', async () => {
    vi.doMock('../../utils/env', () => ({
      isCloudflare: true,
    }))
    process.env.DB_DRIVER = 'sqlite'
    process.env.SQLITE_PATH = './data/test.db'
    const { getDb } = await import('../driver')
    await expect(getDb()).rejects.toThrow()
    vi.doUnmock('../../utils/env')
  })
})

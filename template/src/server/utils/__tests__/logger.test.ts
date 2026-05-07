// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('logger (cloudflare/console)', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.resetModules()
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should create console logger when isCloudflare', async () => {
    vi.doMock('../env', () => ({ isCloudflare: true }))
    vi.doMock('../config', () => ({ getAppConfig: vi.fn() }))
    const { createModuleLoggerSync } = await import('../logger')
    const log = createModuleLoggerSync('cf-module')
    expect(log).toBeDefined()
    expect(typeof log.info).toBe('function')
    vi.doUnmock('../env')
    vi.doUnmock('../config')
  })

  it('should log info via console in cloudflare', async () => {
    vi.doMock('../env', () => ({ isCloudflare: true }))
    vi.doMock('../config', () => ({ getAppConfig: vi.fn() }))
    const { createModuleLoggerSync } = await import('../logger')
    const log = createModuleLoggerSync('cf-info')
    log.info({ key: 'val' }, 'info msg')
    expect(consoleLogSpy).toHaveBeenCalled()
    vi.doUnmock('../env')
    vi.doUnmock('../config')
  })

  it('should log error via console.error in cloudflare', async () => {
    vi.doMock('../env', () => ({ isCloudflare: true }))
    vi.doMock('../config', () => ({ getAppConfig: vi.fn() }))
    const { createModuleLoggerSync } = await import('../logger')
    const log = createModuleLoggerSync('cf-error')
    log.error({ key: 'val' }, 'error msg')
    expect(consoleErrorSpy).toHaveBeenCalled()
    vi.doUnmock('../env')
    vi.doUnmock('../config')
  })

  it('should log fatal via console.error in cloudflare', async () => {
    vi.doMock('../env', () => ({ isCloudflare: true }))
    vi.doMock('../config', () => ({ getAppConfig: vi.fn() }))
    const { createModuleLoggerSync } = await import('../logger')
    const log = createModuleLoggerSync('cf-fatal')
    log.fatal({ key: 'val' }, 'fatal msg')
    expect(consoleErrorSpy).toHaveBeenCalled()
    vi.doUnmock('../env')
    vi.doUnmock('../config')
  })

  it('should log warn via console.warn in cloudflare', async () => {
    vi.doMock('../env', () => ({ isCloudflare: true }))
    vi.doMock('../config', () => ({ getAppConfig: vi.fn() }))
    const { createModuleLoggerSync } = await import('../logger')
    const log = createModuleLoggerSync('cf-warn')
    log.warn({ key: 'val' }, 'warn msg')
    expect(consoleWarnSpy).toHaveBeenCalled()
    vi.doUnmock('../env')
    vi.doUnmock('../config')
  })

  it('should respect log level in cloudflare', async () => {
    vi.doMock('../env', () => ({ isCloudflare: true }))
    vi.doMock('../config', () => ({ getAppConfig: vi.fn() }))
    const { createModuleLoggerSync } = await import('../logger')
    const log = createModuleLoggerSync('cf-level', 'error')
    log.trace({ key: 'val' }, 'trace msg')
    log.debug({ key: 'val' }, 'debug msg')
    log.info({ key: 'val' }, 'info msg')
    expect(consoleLogSpy).not.toHaveBeenCalled()
    log.error({ key: 'val' }, 'error msg')
    expect(consoleErrorSpy).toHaveBeenCalled()
    vi.doUnmock('../env')
    vi.doUnmock('../config')
  })

  it('should create child logger in cloudflare', async () => {
    vi.doMock('../env', () => ({ isCloudflare: true }))
    vi.doMock('../config', () => ({ getAppConfig: vi.fn() }))
    const { createModuleLoggerSync } = await import('../logger')
    const log = createModuleLoggerSync('cf-child')
    const child = log.child({ sub: 'mod' })
    expect(child).toBeDefined()
    expect(typeof child.info).toBe('function')
    vi.doUnmock('../env')
    vi.doUnmock('../config')
  })

  it('should not log in production for default level', async () => {
    vi.doMock('../env', () => ({ isCloudflare: true }))
    vi.doMock('../config', () => ({ getAppConfig: vi.fn() }))
    const { createModuleLoggerSync } = await import('../logger')
    const log = createModuleLoggerSync('cf-prod', 'error')
    const origEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    log.info({ key: 'val' }, 'info msg')
    expect(consoleLogSpy).not.toHaveBeenCalled()
    process.env.NODE_ENV = origEnv
    vi.doUnmock('../env')
    vi.doUnmock('../config')
  })
})

describe('logger (node/pino)', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('should create a pino logger for a module', async () => {
    vi.doMock('../env', () => ({ isCloudflare: false }))
    vi.doMock('../config', () => ({
      getAppConfig: vi.fn(() => ({ nodeEnv: 'test' })),
    }))
    const { createModuleLoggerSync } = await import('../logger')
    const log = createModuleLoggerSync('pino-module')
    expect(log).toBeDefined()
    expect(typeof log.info).toBe('function')
    vi.doUnmock('../env')
    vi.doUnmock('../config')
  })

  it('should cache logger for same module name', async () => {
    vi.doMock('../env', () => ({ isCloudflare: false }))
    vi.doMock('../config', () => ({
      getAppConfig: vi.fn(() => ({ nodeEnv: 'test' })),
    }))
    const { createModuleLoggerSync } = await import('../logger')
    const log1 = createModuleLoggerSync('cache-pino')
    const log2 = createModuleLoggerSync('cache-pino')
    expect(log1).toBe(log2)
    vi.doUnmock('../env')
    vi.doUnmock('../config')
  })

  it('should create logger for development env', async () => {
    vi.doMock('../env', () => ({ isCloudflare: false }))
    vi.doMock('../config', () => ({
      getAppConfig: vi.fn(() => ({ nodeEnv: 'development' })),
    }))
    const { createModuleLoggerSync } = await import('../logger')
    const log = createModuleLoggerSync('dev-logger')
    expect(log).toBeDefined()
    vi.doUnmock('../env')
    vi.doUnmock('../config')
  })

  it('should use explicit log level', async () => {
    vi.doMock('../env', () => ({ isCloudflare: false }))
    vi.doMock('../config', () => ({
      getAppConfig: vi.fn(() => ({ nodeEnv: 'test' })),
    }))
    const { createModuleLoggerSync } = await import('../logger')
    const log = createModuleLoggerSync('level-test', 'debug')
    expect(log).toBeDefined()
    vi.doUnmock('../env')
    vi.doUnmock('../config')
  })

  it('logger convenience methods should work', async () => {
    vi.doMock('../env', () => ({ isCloudflare: false }))
    vi.doMock('../config', () => ({
      getAppConfig: vi.fn(() => ({ nodeEnv: 'test' })),
    }))
    const { logger } = await import('../logger')
    expect(logger.app()).toBeDefined()
    expect(logger.db()).toBeDefined()
    expect(logger.api()).toBeDefined()
    expect(logger.ws()).toBeDefined()
    expect(logger.bootstrap()).toBeDefined()
    expect(logger.module('custom')).toBeDefined()
    vi.doUnmock('../env')
    vi.doUnmock('../config')
  })
})

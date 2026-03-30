/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Mock } from 'vitest'

vi.mock('child_process', async importOriginal => {
  const actual = await importOriginal<typeof import('child_process')>()
  return {
    ...actual,
    spawn: vi.fn(),
  }
})

vi.mock('@anthropic-ai/sandbox-runtime', () => ({
  SandboxManager: {
    initialize: vi.fn().mockResolvedValue(undefined),
    wrapWithSandbox: vi.fn().mockResolvedValue('sanitized-command'),
  },
}))

import { spawn } from 'child_process'
import { initializeSandbox, createSandboxedBashOperations } from '../services/sandbox-bash'
import { SandboxManager } from '@anthropic-ai/sandbox-runtime'

const mockSpawn = vi.mocked(spawn)
const mockSandboxInitialize = vi.mocked(SandboxManager.initialize)
const mockWrapWithSandbox = vi.mocked(SandboxManager.wrapWithSandbox)

/**
 * Creates a mock child process that auto-resolves on 'close' event.
 */
type EventHandler = (...args: unknown[]) => void

function createMockChild() {
  const handlers: Record<string, EventHandler[]> = {}

  function createEmitter(): { on: Mock } {
    return {
      on: vi.fn((event: string, handler: EventHandler) => {
        ;(handlers[event] ??= []).push(handler)
      }),
    }
  }

  const stdout = createEmitter()
  const stderr = createEmitter()

  return {
    stdout,
    stderr,
    on: vi.fn((event: string, handler: EventHandler) => {
      ;(handlers[event] ??= []).push(handler)
    }),
    emit(event: string, ...args: unknown[]) {
      ;(handlers[event] ??= []).forEach(fn => fn(...args))
    },
  }
}

/** Extract first arg from mock call as a typed object */
function getConfigFromCall(index = 0): Record<string, unknown> {
  return mockSandboxInitialize.mock.calls[index][0] as Record<string, unknown>
}

/** Get handlers registered for a specific event on a mock .on() */
function getEventHandlers(mockOn: Mock, eventName: string): EventHandler[] {
  return mockOn.mock.calls
    .filter((call: unknown[]) => call[0] === eventName)
    .map((call: unknown[]) => call[1] as EventHandler)
}

/**
 * Helper: flush microtasks multiple times to allow the async Promise chain
 * (wrapWithSandbox -> .then -> spawn) to complete.
 */
function flushMicrotasks(): Promise<void> {
  return new Promise(resolve => process.nextTick(resolve))
}

async function flushMultiple(times = 5): Promise<void> {
  for (let i = 0; i < times; i++) {
    await flushMicrotasks()
  }
}

describe('Sandbox Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSandboxInitialize.mockResolvedValue(undefined)
    mockWrapWithSandbox.mockResolvedValue('sanitized-command')
  })

  describe('initializeSandbox', () => {
    it('should call SandboxManager.initialize with correct filesystem config', async () => {
      const workspacePath = '/test/workspace'

      await initializeSandbox({ workspacePath })

      expect(mockSandboxInitialize).toHaveBeenCalledTimes(1)
      const config = getConfigFromCall()

      expect(config.filesystem).toEqual({
        allowRead: [workspacePath],
        denyRead: ['~/.ssh', '~/.aws', '~/.git-credentials', '/etc/passwd', '/etc/shadow'],
        allowWrite: [workspacePath, '/tmp'],
        denyWrite: [
          '.env',
          '.env.local',
          '.env.production',
          '.git/config',
          '~/.bashrc',
          '~/.zshrc',
          '~/.profile',
        ],
      })
    })

    it('should enable network access by default (allowedDomains: ["*"])', async () => {
      await initializeSandbox({ workspacePath: '/test/workspace' })

      const config = getConfigFromCall()
      expect(config.network).toEqual({
        allowedDomains: ['*'],
        deniedDomains: [],
      })
    })

    it('should disable network access when allowNetwork is false', async () => {
      await initializeSandbox({ workspacePath: '/test/workspace', allowNetwork: false })

      const config = getConfigFromCall()
      expect(config.network).toEqual({
        allowedDomains: [],
        deniedDomains: [],
      })
    })

    it('should deny reading sensitive files', async () => {
      await initializeSandbox({ workspacePath: '/test/workspace' })

      const config = getConfigFromCall()
      const filesystem = config.filesystem as Record<string, string[]>
      const denyRead = filesystem.denyRead

      expect(denyRead).toContain('~/.ssh')
      expect(denyRead).toContain('~/.aws')
      expect(denyRead).toContain('~/.git-credentials')
      expect(denyRead).toContain('/etc/passwd')
      expect(denyRead).toContain('/etc/shadow')
    })

    it('should deny writing to environment and shell config files', async () => {
      await initializeSandbox({ workspacePath: '/test/workspace' })

      const config = getConfigFromCall()
      const filesystem = config.filesystem as Record<string, string[]>
      const denyWrite = filesystem.denyWrite

      expect(denyWrite).toContain('.env')
      expect(denyWrite).toContain('.env.local')
      expect(denyWrite).toContain('.env.production')
      expect(denyWrite).toContain('.git/config')
      expect(denyWrite).toContain('~/.bashrc')
      expect(denyWrite).toContain('~/.zshrc')
      expect(denyWrite).toContain('~/.profile')
    })

    it('should allow writing only to workspace and /tmp', async () => {
      await initializeSandbox({ workspacePath: '/custom/workspace' })

      const config = getConfigFromCall()
      const filesystem = config.filesystem as Record<string, string[]>
      expect(filesystem.allowWrite).toEqual(['/custom/workspace', '/tmp'])
    })

    it('should handle initializeSandbox errors gracefully', async () => {
      mockSandboxInitialize.mockRejectedValueOnce(new Error('Sandbox init failed'))

      await expect(initializeSandbox({ workspacePath: '/test/workspace' })).rejects.toThrow(
        'Sandbox init failed'
      )
    })
  })

  describe('createSandboxedBashOperations', () => {
    it('should return a BashOperations object with exec method', () => {
      const ops = createSandboxedBashOperations({ workspacePath: '/test/workspace' })
      expect(ops).toBeDefined()
      expect(typeof ops.exec).toBe('function')
    })

    it('should call wrapWithSandbox and spawn with correct arguments', async () => {
      const mockChild = createMockChild()
      mockSpawn.mockReturnValue(mockChild as unknown as ReturnType<typeof spawn>)

      const ops = createSandboxedBashOperations({ workspacePath: '/test/workspace' })
      const onData = vi.fn()

      const execPromise = ops.exec('ls -la', '/test/workspace', { onData })

      // Flush microtasks to let the async chain resolve
      await flushMultiple()

      expect(mockWrapWithSandbox).toHaveBeenCalledWith('ls -la')
      expect(mockSpawn).toHaveBeenCalledWith('sanitized-command', [], {
        cwd: '/test/workspace',
        shell: true,
        signal: undefined,
      })

      mockChild.emit('close', 0)
      const result = await execPromise
      expect(result.exitCode).toBe(0)
    })

    it('should use workspace path as cwd for spawn', async () => {
      const mockChild = createMockChild()
      mockSpawn.mockReturnValue(mockChild as unknown as ReturnType<typeof spawn>)

      const ops = createSandboxedBashOperations({ workspacePath: '/my/workspace' })
      const onData = vi.fn()

      const execPromise = ops.exec('cat file.txt', '/my/workspace', { onData })

      await flushMultiple()

      expect(mockSpawn).toHaveBeenCalledWith(
        'sanitized-command',
        [],
        expect.objectContaining({ cwd: '/my/workspace' })
      )

      mockChild.emit('close', 0)
      await execPromise
    })

    it('should forward stdout data to onData callback', async () => {
      const mockChild = createMockChild()
      mockSpawn.mockReturnValue(mockChild as unknown as ReturnType<typeof spawn>)

      const onData = vi.fn()
      const ops = createSandboxedBashOperations({ workspacePath: '/test/workspace' })

      const execPromise = ops.exec('echo hello', '/test/workspace', { onData })

      await flushMultiple()

      // Simulate stdout data event
      const testData = Buffer.from('hello\n')
      getEventHandlers(mockChild.stdout.on as Mock, 'data').forEach(handler => handler(testData))

      mockChild.emit('close', 0)
      await execPromise

      expect(onData).toHaveBeenCalledWith(testData)
    })

    it('should forward stderr data to onData callback', async () => {
      const mockChild = createMockChild()
      mockSpawn.mockReturnValue(mockChild as unknown as ReturnType<typeof spawn>)

      const onData = vi.fn()
      const ops = createSandboxedBashOperations({ workspacePath: '/test/workspace' })

      const execPromise = ops.exec('bad-command', '/test/workspace', { onData })

      await flushMultiple()

      // Simulate stderr data event
      const testError = Buffer.from('error output\n')
      getEventHandlers(mockChild.stderr.on as Mock, 'data').forEach(handler => handler(testError))

      mockChild.emit('close', 1)
      await execPromise

      expect(onData).toHaveBeenCalledWith(testError)
    })

    it('should handle SandboxManager.wrapWithSandbox errors', async () => {
      mockWrapWithSandbox.mockRejectedValueOnce(new Error('Sandbox unavailable'))

      const onData = vi.fn()
      const ops = createSandboxedBashOperations({ workspacePath: '/test/workspace' })

      const result = await ops.exec('ls', '/test/workspace', { onData })

      expect(result.exitCode).toBe(1)
      expect(onData).toHaveBeenCalledWith(Buffer.from('Sandbox wrap error: Sandbox unavailable\n'))
      expect(mockSpawn).not.toHaveBeenCalled()
    })

    it('should handle spawn errors gracefully', async () => {
      const mockChild = createMockChild()
      mockSpawn.mockReturnValue(mockChild as unknown as ReturnType<typeof spawn>)

      const onData = vi.fn()
      const ops = createSandboxedBashOperations({ workspacePath: '/test/workspace' })

      const execPromise = ops.exec('ls', '/test/workspace', { onData })

      await flushMultiple()

      // Simulate spawn error event
      getEventHandlers(mockChild.on as Mock, 'error').forEach(handler =>
        handler(new Error('spawn ENOENT'))
      )

      const result = await execPromise
      expect(result.exitCode).toBe(1)
      expect(onData).toHaveBeenCalledWith(Buffer.from('Sandbox error: spawn ENOENT\n'))
    })

    it('should pass abort signal to spawn', async () => {
      const mockChild = createMockChild()
      mockSpawn.mockReturnValue(mockChild as unknown as ReturnType<typeof spawn>)

      const ops = createSandboxedBashOperations({ workspacePath: '/test/workspace' })
      const controller = new AbortController()
      const signal = controller.signal

      const execPromise = ops.exec('long-command', '/test/workspace', {
        onData: vi.fn(),
        signal,
      })

      await flushMultiple()

      expect(mockSpawn).toHaveBeenCalledWith('sanitized-command', [], {
        cwd: '/test/workspace',
        shell: true,
        signal,
      })

      mockChild.emit('close', 0)
      await execPromise
    })

    it('should return child process exit code', async () => {
      const mockChild = createMockChild()
      mockSpawn.mockReturnValue(mockChild as unknown as ReturnType<typeof spawn>)

      const ops = createSandboxedBashOperations({ workspacePath: '/test/workspace' })

      const execPromise = ops.exec('exit 42', '/test/workspace', {
        onData: vi.fn(),
      })

      await flushMultiple()

      mockChild.emit('close', 42)

      const result = await execPromise
      expect(result.exitCode).toBe(42)
    })
  })
})

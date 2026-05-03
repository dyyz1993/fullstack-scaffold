/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createShutdownHandler } from '../entries/shutdown'

describe('createShutdownHandler', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
  })

  afterEach(() => {
    exitSpy.mockRestore()
  })

  it('should close database connection', async () => {
    const closeDbSpy = vi.fn().mockResolvedValue(undefined)
    const mockServer = {
      close: vi.fn((cb?: () => void) => {
        cb?.()
      }),
    }

    const shutdown = createShutdownHandler(mockServer, closeDbSpy)
    await shutdown()

    expect(closeDbSpy).toHaveBeenCalled()
    expect(mockServer.close).toHaveBeenCalled()
  })

  it('should set force exit timeout', async () => {
    vi.useFakeTimers()
    const closeDbSpy = vi.fn().mockResolvedValue(undefined)
    const mockServer = { close: vi.fn() }

    const shutdown = createShutdownHandler(mockServer, closeDbSpy)

    shutdown()
    expect(exitSpy).not.toHaveBeenCalled()

    vi.advanceTimersByTime(10000)
    expect(exitSpy).toHaveBeenCalledWith(1)

    vi.useRealTimers()
  })

  it('should prevent double shutdown', async () => {
    const closeDbSpy = vi.fn().mockResolvedValue(undefined)
    const mockServer = { close: vi.fn() }

    const shutdown = createShutdownHandler(mockServer, closeDbSpy)

    await shutdown()
    await shutdown()

    expect(closeDbSpy).toHaveBeenCalledTimes(1)
  })

  it('should handle closeDb error gracefully', async () => {
    const closeDbSpy = vi.fn().mockRejectedValue(new Error('DB close failed'))
    const mockServer = { close: vi.fn() }

    const shutdown = createShutdownHandler(mockServer, closeDbSpy)
    await shutdown()

    expect(closeDbSpy).toHaveBeenCalled()
  })
})

/**
 * SSE Test Utilities
 * Provides type-safe SSE testing with RPC client
 * Types are automatically inferred from the RPC client
 */

import type { z } from 'zod'
import type { ClientResponse } from 'hono/client'

export interface SSETestOptions<T> {
  timeout?: number
  maxEvents?: number
  validateType?: (data: unknown) => data is T
}

export interface SSETestResult<T> {
  events: T[]
  rawLines: string[]
  duration: number
}

export interface SSETestClient<T> {
  collect: (options?: SSETestOptions<T>) => Promise<SSETestResult<T>>
  firstEvent: (options?: Omit<SSETestOptions<T>, 'maxEvents'>) => Promise<T>
  expectEvent: (predicate: (data: T) => boolean, options?: SSETestOptions<T>) => Promise<T>
}

function parseSSELine(line: string): { event?: string; data?: string } | null {
  if (line.startsWith('event:')) {
    return { event: line.slice(6).trim() }
  }
  if (line.startsWith('data:')) {
    return { data: line.slice(5).trim() }
  }
  return null
}

export async function* consumeSSEStream<T>(
  streamFactory: (signal: AbortSignal) => Promise<ClientResponse<T>>,
  signal: AbortSignal
): AsyncIterable<{ event?: string; data: T }> {
  const responsePromise = streamFactory(signal)
  const res = (await responsePromise) as unknown as Response
  if (!res.ok || !res.body) {
    throw new Error(`SSE request failed: ${res.status} ${res.statusText}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()

  let buffer = ''
  let currentEvent: string | undefined
  let currentData: string | undefined

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.trim() === '') {
        if (currentData !== undefined) {
          try {
            const parsedData = JSON.parse(currentData)
            yield {
              event: currentEvent,
              data: {
                event: currentEvent || 'message',
                data: parsedData,
              } as T,
            }
          } catch {
            console.error('Failed to parse SSE data:', currentData)
          }
        }
        currentEvent = undefined
        currentData = undefined
      } else {
        const parsed = parseSSELine(line)
        if (parsed?.event) {
          currentEvent = parsed.event
        } else if (parsed?.data) {
          currentData = currentData ? currentData + parsed.data : parsed.data
        }
      }
    }
  }
}

export function createSSETestClient<T>(
  streamFactory: (signal: AbortSignal) => Promise<ClientResponse<T>>,
  defaultOptions: SSETestOptions<T> = {}
): SSETestClient<T> {
  const collect = async (options: SSETestOptions<T> = {}): Promise<SSETestResult<T>> => {
    const { timeout = 5000, maxEvents = 10, validateType } = { ...defaultOptions, ...options }
    const events: T[] = []
    const rawLines: string[] = []
    const startTime = Date.now()

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      for await (const { data } of consumeSSEStream(streamFactory, controller.signal)) {
        if (validateType && !validateType(data)) {
          throw new TypeError(`SSE data failed type validation: ${JSON.stringify(data)}`)
        }
        events.push(data)
        rawLines.push(JSON.stringify(data))

        if (events.length >= maxEvents) {
          break
        }
      }
    } finally {
      clearTimeout(timeoutId)
      controller.abort()
    }

    return {
      events,
      rawLines,
      duration: Date.now() - startTime,
    }
  }

  const firstEvent = async (options: Omit<SSETestOptions<T>, 'maxEvents'> = {}): Promise<T> => {
    const result = await collect({ ...options, maxEvents: 1 })
    if (result.events.length === 0) {
      throw new Error('No events received within timeout')
    }
    return result.events[0]
  }

  const expectEvent = async (
    predicate: (data: T) => boolean,
    options: SSETestOptions<T> = {}
  ): Promise<T> => {
    const { timeout = 5000, validateType } = { ...defaultOptions, ...options }
    const startTime = Date.now()

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      for await (const { data } of consumeSSEStream(streamFactory, controller.signal)) {
        if (validateType && !validateType(data)) {
          throw new TypeError(`SSE data failed type validation: ${JSON.stringify(data)}`)
        }
        if (predicate(data)) {
          clearTimeout(timeoutId)
          controller.abort()
          return data
        }
      }
    } finally {
      clearTimeout(timeoutId)
    }

    throw new Error(
      `Expected event not found within ${timeout}ms (waited ${Date.now() - startTime}ms)`
    )
  }

  return {
    collect,
    firstEvent,
    expectEvent,
  }
}

export function createTypeValidator<T extends z.ZodTypeAny>(schema: T) {
  return (data: unknown): data is z.infer<T> => {
    const result = schema.safeParse(data)
    return result.success
  }
}

export function createSSETypeValidator<T extends z.ZodTypeAny>(schema: T) {
  return {
    validate: createTypeValidator(schema),
    assert: (data: unknown): z.infer<T> => {
      const result = schema.parse(data)
      return result
    },
  }
}

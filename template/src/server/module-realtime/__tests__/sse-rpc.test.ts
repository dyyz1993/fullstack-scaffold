import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createTestClient } from '../../test-utils/test-client'
import {
  createSSETestClient,
  createSSETypeValidator,
  consumeSSEStream,
} from '../../test-utils/test-sse'
import * as notificationService from '../../module-notifications/services/notification-service'
import { NotificationSchema, SSEEventSchema } from '@shared/schemas'

describe('SSE Routes with Type-Safe Test Client', () => {
  beforeEach(() => {
    notificationService.clearAllNotifications()
  })

  afterEach(() => {
    notificationService.clearAllNotifications()
  })

  describe('GET /api/notifications/stream', () => {
    it('should establish SSE connection and receive events', async () => {
      const client = createTestClient()
      const validator = createSSETypeValidator(SSEEventSchema)

      const sseClient = createSSETestClient(
        signal => client.api.notifications.stream.$get({ signal }),
        { validateType: validator.validate }
      )

      const result = await sseClient.collect({ maxEvents: 1, timeout: 3000 })

      expect(result.events.length).toBeGreaterThanOrEqual(1)
      expect(result.duration).toBeLessThan(4000)

      result.events.forEach(event => {
        expect(['notification', 'ping', 'connected']).toContain(event.event)
      })
    })

    it('should use raw consumeSSEStream for low-level testing', async () => {
      const client = createTestClient()

      const controller = new AbortController()
      const events: Array<{ event: string; data: unknown }> = []

      const streamPromise = (async () => {
        for await (const { data } of consumeSSEStream(
          signal => client.api.notifications.stream.$get({ signal }),
          controller.signal
        )) {
          events.push(data)
          if (events.length >= 1) break
        }
      })()

      await streamPromise
      controller.abort()

      expect(events.length).toBeGreaterThanOrEqual(1)
      events.forEach(event => {
        expect(['notification', 'ping', 'connected']).toContain(event.event)
      })
    })
  })

  describe('SSE Type Inference', () => {
    it('should infer correct types from RPC client', async () => {
      const client = createTestClient()

      const streamPromise = client.api.notifications.stream.$get({})

      const res = (await streamPromise) as unknown as Response
      expect(res.headers.get('content-type')).toContain('text/event-stream')
      expect(res.body).not.toBeNull()

      const reader = res.body!.getReader()
      await reader.cancel()
    })

    it('should work with typed SSE test client', async () => {
      const client = createTestClient()
      const validator = createSSETypeValidator(SSEEventSchema)

      const sseClient = createSSETestClient(
        signal => client.api.notifications.stream.$get({ signal }),
        { validateType: validator.validate }
      )

      const result = await sseClient.collect({ maxEvents: 1, timeout: 2000 })

      result.events.forEach(event => {
        expect(() => validator.assert(event)).not.toThrow()
        expect(event.event).toBeDefined()
        expect(event.data).toBeDefined()
      })
    })

    it('should validate SSE event schema at runtime', async () => {
      const client = createTestClient()
      const sseValidator = createSSETypeValidator(SSEEventSchema)

      const sseClient = createSSETestClient(
        signal => client.api.notifications.stream.$get({ signal }),
        { validateType: sseValidator.validate }
      )

      const result = await sseClient.collect({ maxEvents: 1, timeout: 2000 })

      result.events.forEach(event => {
        expect(() => sseValidator.assert(event)).not.toThrow()
        expect(event.event).toBeDefined()
        expect(event.data).toBeDefined()
      })
    })

    it('should correctly type notification data within SSE events', async () => {
      const client = createTestClient()
      const sseValidator = createSSETypeValidator(SSEEventSchema)
      const notifValidator = createSSETypeValidator(NotificationSchema)

      const sseClient = createSSETestClient(
        signal => client.api.notifications.stream.$get({ signal }),
        { validateType: sseValidator.validate }
      )

      const result = await sseClient.collect({ maxEvents: 1, timeout: 3000 })

      expect(result.events.length).toBeGreaterThanOrEqual(1)

      result.events.forEach(event => {
        if (event.event === 'connected' || event.event === 'ping') {
          expect(event.data).toHaveProperty('timestamp')
        } else if (event.event === 'notification') {
          const data = event.data
          if ('id' in data && 'type' in data && 'title' in data) {
            expect(() => notifValidator.assert(data)).not.toThrow()
            expect(data.id).toBeDefined()
            expect(data.type).toBeDefined()
            expect(data.title).toBeDefined()
            expect(data.message).toBeDefined()
            expect(data.read).toBeDefined()
            expect(data.createdAt).toBeDefined()
          }
        }
      })
    })
  })
})

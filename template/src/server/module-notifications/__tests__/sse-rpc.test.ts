import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createTestClient } from '../../test-utils/test-client'
import {
  createSSETestClient,
  createSSETypeValidator,
  consumeSSEStream,
} from '../../test-utils/test-sse'
import * as notificationService from '../services/notification-service'
import { NotificationSchema, AppSSEProtocolSchema } from '@shared/schemas'
import type { AppSSEProtocol } from '@shared/schemas'

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
      const validator = createSSETypeValidator(AppSSEProtocolSchema)

      const sseClient = createSSETestClient<AppSSEProtocol>(
        signal => client.api.notifications.stream.$get({ signal }),
        { validateType: validator.validate }
      )

      const result = await sseClient.collect({ maxEvents: 1, timeout: 3000 })

      expect(result.events.length).toBeGreaterThanOrEqual(1)
      expect(result.duration).toBeLessThan(4000)
    })

    it('should use raw consumeSSEStream for low-level testing', async () => {
      const client = createTestClient()

      const controller = new AbortController()
      const events: unknown[] = []

      const streamPromise = (async () => {
        for await (const { data } of consumeSSEStream<AppSSEProtocol>(
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
    })
  })

  describe('SSE Type Inference', () => {
    it('should use $sse() method for type-safe SSE connection', async () => {
      const client = createTestClient()

      const conn = await client.api.notifications.stream.$sse()

      expect(['connecting', 'open', 'closed']).toContain(conn.status)

      const receivedNotifications: AppSSEProtocol['events']['notification'][] = []

      const unsubscribe = conn.on('notification', notification => {
        receivedNotifications.push(notification)
      })

      conn.on('ping', ping => {
        expect(ping.timestamp).toBeDefined()
      })

      conn.on('connected', connected => {
        expect(connected.timestamp).toBeDefined()
      })

      await new Promise(resolve => setTimeout(resolve, 1000))

      unsubscribe()
      conn.abort()
    })

    it('should work with typed SSE test client', async () => {
      const client = createTestClient()
      const validator = createSSETypeValidator(AppSSEProtocolSchema)

      const sseClient = createSSETestClient<AppSSEProtocol>(
        signal => client.api.notifications.stream.$get({ signal }),
        { validateType: validator.validate }
      )

      const result = await sseClient.collect({ maxEvents: 1, timeout: 2000 })

      result.events.forEach(event => {
        expect(() => validator.assert(event)).not.toThrow()
      })
    })

    it('should validate SSE event schema at runtime', async () => {
      const client = createTestClient()
      const sseValidator = createSSETypeValidator(AppSSEProtocolSchema)

      const sseClient = createSSETestClient<AppSSEProtocol>(
        signal => client.api.notifications.stream.$get({ signal }),
        { validateType: sseValidator.validate }
      )

      const result = await sseClient.collect({ maxEvents: 1, timeout: 2000 })

      result.events.forEach(event => {
        expect(() => sseValidator.assert(event)).not.toThrow()
      })
    })

    it('should correctly type notification data within SSE events', async () => {
      const client = createTestClient()
      const sseValidator = createSSETypeValidator(AppSSEProtocolSchema)
      const notifValidator = createSSETypeValidator(NotificationSchema)

      const sseClient = createSSETestClient<AppSSEProtocol>(
        signal => client.api.notifications.stream.$get({ signal }),
        { validateType: sseValidator.validate }
      )

      const result = await sseClient.collect({ maxEvents: 1, timeout: 3000 })

      expect(result.events.length).toBeGreaterThanOrEqual(1)

      result.events.forEach(event => {
        if ('events' in event && event.events) {
          if ('notification' in event.events) {
            const notification = event.events.notification
            expect(() => notifValidator.assert(notification)).not.toThrow()
            expect(notification.id).toBeDefined()
            expect(notification.type).toBeDefined()
            expect(notification.title).toBeDefined()
            expect(notification.message).toBeDefined()
            expect(notification.read).toBeDefined()
            expect(notification.createdAt).toBeDefined()
          }
          if ('ping' in event.events) {
            expect(event.events.ping.timestamp).toBeDefined()
          }
          if ('connected' in event.events) {
            expect(event.events.connected.timestamp).toBeDefined()
          }
        }
      })
    })
  })
})

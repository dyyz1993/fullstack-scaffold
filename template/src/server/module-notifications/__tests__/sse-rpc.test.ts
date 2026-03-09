import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { createApp } from '../../app'
import { createTestClient } from '../../test-utils/test-client'
import { createTestServer } from '../../test-utils/test-server'
import { setRuntimeAdapter } from '@server/core/runtime'
import { getNodeRuntimeAdapter } from '@server/core/runtime-node'
import { initNotificationHandlers } from '../services/notification-service'
import { createSSEClient } from '@shared/services/sseClient'
import * as notificationService from '../services/notification-service'
import type { AppSSEProtocol } from '@shared/schemas'

setRuntimeAdapter(getNodeRuntimeAdapter())
initNotificationHandlers()

describe('SSE Routes with Type-Safe Test Client', () => {
  let testServer: Awaited<ReturnType<typeof createTestServer>>
  let client: ReturnType<typeof createTestClient>

  beforeAll(async () => {
    const app = createApp()
    testServer = await createTestServer(app, ['/api/notifications/stream'])
    client = createTestClient(`http://localhost:${testServer.port}`, {
      sse: (url: string | URL) => createSSEClient(url),
    })
  }, 15000)

  afterAll(async () => {
    await testServer.close()
  }, 15000)

  beforeEach(() => {
    notificationService.clearAllNotifications()
  })

  afterEach(() => {
    notificationService.clearAllNotifications()
  })

  describe('GET /api/notifications/stream', () => {
    it('should use $sse() method for type-safe SSE connection', async () => {
      const conn = client.api.notifications.stream.$sse()

      expect(['connecting', 'open', 'closed']).toContain(conn.status)

      const receivedNotifications: AppSSEProtocol['events']['notification'][] = []
      const receivedPings: AppSSEProtocol['events']['ping'][] = []
      const receivedConnected: AppSSEProtocol['events']['connected'][] = []

      const unsubscribeNotification = conn.on('notification', notification => {
        receivedNotifications.push(notification)
      })

      const unsubscribePing = conn.on('ping', ping => {
        receivedPings.push(ping)
      })

      const unsubscribeConnected = conn.on('connected', connected => {
        receivedConnected.push(connected)
      })

      await new Promise(resolve => setTimeout(resolve, 2000))

      unsubscribeNotification()
      unsubscribePing()
      unsubscribeConnected()
      conn.abort()

      const totalEvents =
        receivedNotifications.length + receivedPings.length + receivedConnected.length
      expect(totalEvents).toBeGreaterThanOrEqual(1)
    })

    it('should receive typed notification events', async () => {
      const conn = client.api.notifications.stream.$sse()

      const receivedNotifications: AppSSEProtocol['events']['notification'][] = []

      const unsubscribe = conn.on('notification', notification => {
        receivedNotifications.push(notification)
      })

      await new Promise(resolve => setTimeout(resolve, 2000))

      unsubscribe()
      conn.abort()

      receivedNotifications.forEach(notification => {
        expect(notification.id).toBeDefined()
        expect(notification.type).toBeDefined()
        expect(notification.title).toBeDefined()
        expect(notification.message).toBeDefined()
        expect(notification.read).toBeDefined()
        expect(notification.createdAt).toBeDefined()
      })
    })

    it('should receive typed ping events', async () => {
      const conn = client.api.notifications.stream.$sse()

      const receivedPings: AppSSEProtocol['events']['ping'][] = []

      const unsubscribe = conn.on('ping', ping => {
        receivedPings.push(ping)
      })

      await new Promise(resolve => setTimeout(resolve, 2000))

      unsubscribe()
      conn.abort()

      receivedPings.forEach(ping => {
        expect(ping.timestamp).toBeDefined()
        expect(typeof ping.timestamp).toBe('number')
      })
    })

    it('should receive typed connected events', async () => {
      const conn = client.api.notifications.stream.$sse()

      const receivedConnected: AppSSEProtocol['events']['connected'][] = []

      const unsubscribe = conn.on('connected', connected => {
        receivedConnected.push(connected)
      })

      await new Promise(resolve => setTimeout(resolve, 2000))

      unsubscribe()
      conn.abort()

      receivedConnected.forEach(connected => {
        expect(connected.timestamp).toBeDefined()
        expect(typeof connected.timestamp).toBe('number')
      })
    })

    it('should handle connection status changes', async () => {
      const conn = client.api.notifications.stream.$sse()

      const statusHistory: ('connecting' | 'open' | 'closed')[] = []

      const unsubscribe = conn.onStatusChange(status => {
        statusHistory.push(status)
      })

      await new Promise(resolve => setTimeout(resolve, 1000))

      conn.abort()

      await new Promise(resolve => setTimeout(resolve, 100))

      unsubscribe()

      expect(statusHistory).toContain('open')
      expect(statusHistory).toContain('closed')
    })

    it('should handle errors gracefully', async () => {
      const conn = client.api.notifications.stream.$sse()

      const unsubscribe = conn.onError(error => {
        console.error('SSE error:', error)
      })

      await new Promise(resolve => setTimeout(resolve, 1000))

      unsubscribe()
      conn.abort()

      expect(conn.status).toBe('closed')
    })
  })
})

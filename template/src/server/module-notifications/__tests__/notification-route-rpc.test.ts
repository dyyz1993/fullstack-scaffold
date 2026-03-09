import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest'
import { createTestClient } from '../../test-utils/test-client'
import { setRuntimeAdapter } from '@server/core/runtime'
import { getNodeRuntimeAdapter } from '@server/core/runtime-node'
import * as notificationService from '../services/notification-service'

import type { AppNotification } from '@shared/schemas'

setRuntimeAdapter(getNodeRuntimeAdapter())

describe('Notification Routes with Type-Safe Test Client', () => {
  beforeAll(() => {
    notificationService.initNotificationHandlers()
  })

  beforeEach(() => {
    notificationService.clearAllNotifications()
  })

  afterEach(() => {
    notificationService.clearAllNotifications()
  })

  describe('GET /api/notifications', () => {
    it('should return empty array', async () => {
      const client = createTestClient()

      const res = await client.api.notifications.$get({
        query: {},
      })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data).toEqual([])
      expect(data.nextCursor).toBeUndefined()
    })

    it('should return notifications list with pagination', async () => {
      notificationService.createNotification({
        type: 'info',
        title: 'Test 1',
        message: 'Message 1',
      })
      notificationService.createNotification({
        type: 'warning',
        title: 'Test 2',
        message: 'Message 2',
      })

      const client = createTestClient()
      const res = await client.api.notifications.$get({
        query: { limit: '1' },
      })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(1)
      expect(data.nextCursor).toBeDefined()
    })

    it('should filter unread notifications', async () => {
      const notif1 = notificationService.createNotification({
        type: 'info',
        title: 'Read',
        message: 'Already read',
      })
      notif1.read = true

      notificationService.createNotification({
        type: 'info',
        title: 'Unread',
        message: 'Not read yet',
      })

      const client = createTestClient()
      const res = await client.api.notifications.$get({
        query: { unreadOnly: 'true' },
      })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(1)
      expect(data.data[0].read).toBe(false)
    })
  })

  describe('POST /api/notifications', () => {
    it('should create a notification with type safety', async () => {
      const client = createTestClient()

      const res = await client.api.notifications.$post({
        json: {
          type: 'info',
          title: 'New Notification',
          message: 'Test message',
        },
      })

      expect(res.status).toBe(201)

      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success && 'data' in data) {
        expect(data.data.type).toBe('info')
        expect(data.data.title).toBe('New Notification')
        expect(data.data.message).toBe('Test message')
        expect(data.data.read).toBe(false)
        expect(data.data.id).toBeDefined()
        expect(data.data.createdAt).toBeDefined()
      }
    })

    it('should reject invalid type', async () => {
      const client = createTestClient()

      const res = await client.api.notifications.$post({
        json: {
          type: 'invalid' as AppNotification['type'],
          title: 'Test',
          message: 'Test',
        },
      })

      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/notifications/:id', () => {
    it('should return 404 for non-existent notification', async () => {
      const client = createTestClient()

      const res = await client.api.notifications[':id'].$get({
        param: { id: 'non-existent-id' },
      })
      expect(res.status).toBe(404)
    })

    it('should return notification by id with type safety', async () => {
      const notif = notificationService.createNotification({
        type: 'info',
        title: 'Find Me',
        message: 'Test',
      })

      const client = createTestClient()
      const res = await client.api.notifications[':id'].$get({
        param: { id: notif.id },
      })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success && 'data' in data) {
        expect(data.data.id).toBe(notif.id)
        expect(data.data.title).toBe('Find Me')
      }
    })
  })

  describe('PATCH /api/notifications/:id/read', () => {
    it('should mark notification as read with type safety', async () => {
      const notif = notificationService.createNotification({
        type: 'info',
        title: 'Mark Read',
        message: 'Test',
      })
      expect(notif.read).toBe(false)

      const client = createTestClient()
      const res = await client.api.notifications[':id'].read.$patch({
        param: { id: notif.id },
      })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success && 'data' in data) {
        expect(data.data.read).toBe(true)
      }
    })

    it('should return 404 for non-existent notification', async () => {
      const client = createTestClient()

      const res = await client.api.notifications[':id'].read.$patch({
        param: { id: 'non-existent-id' },
      })
      expect(res.status).toBe(404)
    })
  })

  describe('PATCH /api/notifications/read-all', () => {
    it('should mark all notifications as read', async () => {
      notificationService.createNotification({
        type: 'info',
        title: 'Unread 1',
        message: 'Test',
      })
      notificationService.createNotification({
        type: 'warning',
        title: 'Unread 2',
        message: 'Test',
      })

      const client = createTestClient()
      const res = await client.api.notifications['read-all'].$patch()
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.count).toBe(2)
    })
  })

  describe('DELETE /api/notifications/:id', () => {
    it('should delete notification with type safety', async () => {
      const notif = notificationService.createNotification({
        type: 'info',
        title: 'To Delete',
        message: 'Test',
      })

      const client = createTestClient()
      const res = await client.api.notifications[':id'].$delete({
        param: { id: notif.id },
      })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success && 'data' in data) {
        expect(data.data.id).toBe(notif.id)
      }

      const deleted = notificationService.getNotification(notif.id)
      expect(deleted).toBeUndefined()
    })

    it('should return 404 for non-existent notification', async () => {
      const client = createTestClient()

      const res = await client.api.notifications[':id'].$delete({
        param: { id: 'non-existent-id' },
      })
      expect(res.status).toBe(404)
    })
  })

  describe('GET /api/notifications/unread-count', () => {
    it('should return unread count', async () => {
      notificationService.createNotification({
        type: 'info',
        title: 'Unread',
        message: 'Test',
      })
      const readNotif = notificationService.createNotification({
        type: 'info',
        title: 'Read',
        message: 'Test',
      })
      readNotif.read = true

      const client = createTestClient()
      const res = await client.api.notifications['unread-count'].$get()
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.count).toBe(1)
    })
  })
})

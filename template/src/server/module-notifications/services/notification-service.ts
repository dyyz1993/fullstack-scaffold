/**
 * Notification service
 * In-memory notification storage with SSE broadcasting
 */

import { randomUUID } from 'crypto';
import type {
  AppNotification,
  CreateNotificationInput,
} from '@shared/schemas';

// In-memory storage (replace with database in production)
const notifications: AppNotification[] = [];

// SSE clients registry
const sseClients = new Set<{
  id: string;
  controller: ReadableStreamDefaultController;
}>();

export function listNotifications(options: {
  unreadOnly?: boolean;
  limit?: number;
  cursor?: string;
}): { data: AppNotification[]; nextCursor?: string } {
  let filtered = [...notifications];

  if (options.unreadOnly) {
    filtered = filtered.filter((n) => !n.read);
  }

  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const limit = options.limit ?? 20;
  let startIndex = 0;

  if (options.cursor) {
    const cursorIndex = filtered.findIndex((n) => n.id === options.cursor);
    if (cursorIndex !== -1) {
      startIndex = cursorIndex + 1;
    }
  }

  const data = filtered.slice(startIndex, startIndex + limit);
  const nextCursor = data.length === limit ? data[data.length - 1]?.id : undefined;

  return { data, nextCursor };
}

export function getNotification(id: string): AppNotification | undefined {
  return notifications.find((n) => n.id === id);
}

export function createNotification(input: CreateNotificationInput): AppNotification {
  const notification: AppNotification = {
    id: randomUUID(),
    type: input.type,
    title: input.title,
    message: input.message,
    read: false,
    createdAt: new Date().toISOString(),
  };

  notifications.unshift(notification);

  broadcastToSSEClients('notification', notification);

  return notification;
}

export function markAsRead(id: string): AppNotification | undefined {
  const notification = notifications.find((n) => n.id === id);
  if (notification) {
    notification.read = true;
  }
  return notification;
}

export function markAllAsRead(): number {
  let count = 0;
  notifications.forEach((n) => {
    if (!n.read) {
      n.read = true;
      count++;
    }
  });
  return count;
}

export function deleteNotification(id: string): boolean {
  const index = notifications.findIndex((n) => n.id === id);
  if (index !== -1) {
    notifications.splice(index, 1);
    return true;
  }
  return false;
}

export function getUnreadCount(): number {
  return notifications.filter((n) => !n.read).length;
}

// SSE helpers
export function registerSSEClient(
  controller: ReadableStreamDefaultController
): string {
  const id = randomUUID();
  sseClients.add({ id, controller });

  sendSSEEvent(controller, 'connected', { timestamp: Date.now() });

  return id;
}

export function unregisterSSEClient(id: string): void {
  for (const client of sseClients) {
    if (client.id === id) {
      sseClients.delete(client);
      break;
    }
  }
}

function sendSSEEvent(
  controller: ReadableStreamDefaultController,
  event: string,
  data: unknown
): void {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(new TextEncoder().encode(message));
}

function broadcastToSSEClients(event: string, data: unknown): void {
  for (const client of sseClients) {
    try {
      sendSSEEvent(client.controller, event, data);
    } catch {
      sseClients.delete(client);
    }
  }
}

export function startSSEPingInterval(): NodeJS.Timeout {
  return setInterval(() => {
    broadcastToSSEClients('ping', { timestamp: Date.now() });
  }, 30000);
}

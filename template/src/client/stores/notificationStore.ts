import { create } from 'zustand';
import { apiClient } from '@client/services/apiClient';
import type { AppNotification, CreateNotificationInput } from '@shared/schemas';

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  sseConnected: boolean;

  fetchNotifications: (unreadOnly?: boolean) => Promise<void>;
  createNotification: (input: CreateNotificationInput) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  connectSSE: () => Promise<void>;
  disconnectSSE: () => void;
}

let sseAbortController: AbortController | null = null;

function parseSSEMessage(message: string): { event: string; data: unknown } | null {
  const lines = message.split('\n');
  let event = '';
  let data = '';

  for (const line of lines) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      data = line.slice(5).trim();
    }
  }

  if (event && data) {
    try {
      return { event, data: JSON.parse(data) };
    } catch {
      return { event, data };
    }
  }

  return null;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  sseConnected: false,

  fetchNotifications: async (unreadOnly = false) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.api.notifications.$get({
        query: { unreadOnly: String(unreadOnly) },
      });
      const result = await response.json();
      if (result.success && 'data' in result) {
        set({ notifications: result.data as AppNotification[], loading: false });
      } else {
        set({ error: 'Failed to fetch', loading: false });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false,
      });
    }
  },

  createNotification: async (input) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.api.notifications.$post({
        json: input,
      });
      const result = await response.json();
      if (result.success && 'data' in result) {
        set((state) => ({
          notifications: [result.data as AppNotification, ...state.notifications],
          loading: false,
        }));
      } else {
        set({ error: 'Failed to create', loading: false });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false,
      });
    }
  },

  markAsRead: async (id: string) => {
    try {
      const response = await apiClient.api.notifications[':id'].read.$patch({
        param: { id },
      });
      const result = await response.json();
      if (result.success && 'data' in result) {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        }));
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  },

  markAllAsRead: async () => {
    try {
      const response = await apiClient.api.notifications['read-all'].$patch();
      const result = await response.json();
      if (result.success) {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        }));
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  },

  deleteNotification: async (id: string) => {
    try {
      const response = await apiClient.api.notifications[':id'].$delete({
        param: { id },
      });
      const result = await response.json();
      if (result.success) {
        set((state) => {
          const notification = state.notifications.find((n) => n.id === id);
          return {
            notifications: state.notifications.filter((n) => n.id !== id),
            unreadCount: notification && !notification.read
              ? state.unreadCount - 1
              : state.unreadCount,
          };
        });
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  },

  fetchUnreadCount: async () => {
    try {
      const response = await apiClient.api.notifications['unread-count'].$get();
      const result = await response.json();
      if (result.success && 'data' in result) {
        set({ unreadCount: (result.data as { count: number }).count });
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  },

  connectSSE: async () => {
    if (sseAbortController) return;

    sseAbortController = new AbortController();
    set({ sseConnected: true });

    try {
      const apiBase = import.meta.env.VITE_API_BASE || '';
      const response = await fetch(`${apiBase}/api/notifications/stream`, {
        signal: sseAbortController.signal,
        headers: {
          Accept: 'text/event-stream',
        },
      });

      if (!response.ok) {
        throw new Error(`SSE connection failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const messages = buffer.split('\n\n');
        buffer = messages.pop() || '';

        for (const message of messages) {
          const parsed = parseSSEMessage(message);
          if (parsed?.event === 'notification') {
            const notification = parsed.data as AppNotification;
            set((state) => {
              if (state.notifications.some(n => n.id === notification.id)) {
                return state;
              }
              return {
                notifications: [notification, ...state.notifications],
                unreadCount: notification.read ? state.unreadCount : state.unreadCount + 1,
              };
            });
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('SSE error:', error);
      set({ sseConnected: false });
      
      setTimeout(() => {
        sseAbortController = null;
        get().connectSSE();
      }, 5000);
    } finally {
      sseAbortController = null;
      set({ sseConnected: false });
    }
  },

  disconnectSSE: () => {
    if (sseAbortController) {
      sseAbortController.abort();
      sseAbortController = null;
      set({ sseConnected: false });
    }
  },
}));

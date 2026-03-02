/**
 * WebSocket module schemas
 * Demonstrates WebSocket support with type inference
 */

import { z } from 'zod';

export const WSMessageTypeSchema = z.enum([
  'ping',
  'pong',
  'echo',
  'broadcast',
  'notification',
]);

export const WSMessageSchema = z.object({
  type: WSMessageTypeSchema,
  payload: z.unknown(),
  timestamp: z.number().optional(),
});

export const WSEchoPayloadSchema = z.object({
  message: z.string(),
});

export const WSNotificationPayloadSchema = z.object({
  title: z.string(),
  body: z.string(),
});

export type WSMessageType = z.infer<typeof WSMessageTypeSchema>;
export type WSMessage = z.infer<typeof WSMessageSchema>;
export type WSEchoPayload = z.infer<typeof WSEchoPayloadSchema>;
export type WSNotificationPayload = z.infer<typeof WSNotificationPayloadSchema>;

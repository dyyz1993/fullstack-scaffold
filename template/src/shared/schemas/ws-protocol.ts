/**
 * WebSocket Protocol Type Definitions
 * Used for type inference in GhostWSClient
 * 
 * This defines the contract between client and server:
 * - rpc: Request-response style calls (call)
 * - events: Server-pushed events (on/emit)
 */

import { z } from 'zod';

export const WSRpcRequestSchema = z.object({
  id: z.string(),
  method: z.string(),
  params: z.unknown(),
});

export const WSRpcResponseSchema = z.object({
  id: z.string(),
  result: z.unknown().optional(),
  error: z.string().optional(),
});

export const WSEventMessageSchema = z.object({
  type: z.string(),
  payload: z.unknown(),
});

export const WSMessageSchema = z.union([
  WSRpcResponseSchema,
  WSEventMessageSchema,
  WSRpcRequestSchema,
]);

export const AppWSProtocolSchema = z.object({
  rpc: z.object({
    echo: z.object({
      in: z.object({ message: z.string() }),
      out: z.object({ message: z.string(), timestamp: z.number() }),
    }),
    ping: z.object({
      in: z.object({}),
      out: z.object({ pong: z.boolean(), timestamp: z.number() }),
    }),
  }),
  events: z.object({
    notification: z.object({
      title: z.string(),
      body: z.string(),
      timestamp: z.number(),
    }),
    broadcast: z.object({
      message: z.string(),
      timestamp: z.number(),
    }),
    connected: z.object({
      timestamp: z.number(),
    }),
    disconnected: z.object({
      timestamp: z.number(),
    }),
  }),
});

export type AppWSProtocol = z.infer<typeof AppWSProtocolSchema>;
export type WSRpcRequest = z.infer<typeof WSRpcRequestSchema>;
export type WSRpcResponse = z.infer<typeof WSRpcResponseSchema>;
export type WSEventMessage = z.infer<typeof WSEventMessageSchema>;
export type WSMessage = z.infer<typeof WSMessageSchema>;

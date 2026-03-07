import { streamSSE } from 'hono/streaming'
import type { TypedResponse } from 'hono'
import { isCloudflare } from '../utils/env'
import type { Context } from 'hono'

export function handleSSERequest(
  c: Context
): TypedResponse<unknown, 200, 'sse'> | Promise<TypedResponse<unknown, 200, 'sse'>> {
  if (isCloudflare && c.env.NOTIFICATION_DO) {
    const id = c.env.NOTIFICATION_DO.idFromName('global')
    const stub = c.env.NOTIFICATION_DO.get(id)
    return stub.fetch(c.req.raw) as unknown as Promise<TypedResponse<unknown, 200, 'sse'>>
  }

  return streamSSE(c, async stream => {
    await stream.writeSSE({
      event: 'connected',
      data: JSON.stringify({ timestamp: Date.now() }),
    })
    while (true) {
      await stream.sleep(30000)
      await stream.writeSSE({
        event: 'ping',
        data: JSON.stringify({ timestamp: Date.now() }),
      })
    }
  }) as unknown as TypedResponse<unknown, 200, 'sse'>
}

export function handleWSRequest(
  c: Context
): TypedResponse<{ protocol: 'AppWSProtocol'; message: string }, 200, 'json'> | Promise<TypedResponse<{ protocol: 'AppWSProtocol'; message: string }, 200, 'json'>> {
  if (isCloudflare && c.env.NOTIFICATION_DO) {
    const id = c.env.NOTIFICATION_DO.idFromName('global')
    const stub = c.env.NOTIFICATION_DO.get(id)
    return stub.fetch(c.req.raw) as unknown as Promise<
      TypedResponse<{ protocol: 'AppWSProtocol'; message: string }, 200, 'json'>
    >
  }

  return c.json({ protocol: 'AppWSProtocol' as const, message: 'WebSocket upgrade required' })
}

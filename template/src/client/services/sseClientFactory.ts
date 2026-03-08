import type { SSEClient, SSEProtocol } from '@shared/schemas'
import { SSEClientImpl } from './sseClient'

export async function createSSEClient<P extends SSEProtocol>(
  url: string | URL
): Promise<SSEClient<P>> {
  return new Promise((resolve, reject) => {
    const client = new SSEClientImpl<P>(url)

    const timeout = setTimeout(() => {
      reject(new Error('SSE connection timeout'))
      client.abort()
    }, 10000)

    client.onStatusChange(status => {
      if (status === 'open') {
        clearTimeout(timeout)
        resolve(client as unknown as SSEClient<P>)
      } else if (status === 'closed') {
        clearTimeout(timeout)
        reject(new Error('SSE connection failed'))
      }
    })
  })
}

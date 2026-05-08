import { hc } from 'hono/client'

export function createRPCClient(baseUrl: string) {
  return hc(baseUrl)
}

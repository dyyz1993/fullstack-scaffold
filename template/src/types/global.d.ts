declare global {
  export type WSStatus = 'connecting' | 'open' | 'closed' | 'reconnecting'

  export interface WSProtocol {
    rpc: Record<string, { in: unknown; out: unknown }>
    events: Record<string, unknown>
  }

  export interface SSEProtocol {
    events: Record<string, unknown>
  }
}

export {}

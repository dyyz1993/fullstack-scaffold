type SSEEventHandler = (event: string, data: unknown) => void

interface SSEConnection {
  send: SSEEventHandler
  close: () => void
}

class SSEManager {
  private connections = new Map<string, Map<string, SSEConnection>>()

  subscribe(agentId: string, userId: string, connection: SSEConnection): () => void {
    if (!this.connections.has(agentId)) {
      this.connections.set(agentId, new Map())
    }
    const agentConnections = this.connections.get(agentId)!
    const key = `${agentId}:${userId}`
    agentConnections.set(key, connection)

    return () => {
      agentConnections.delete(key)
      if (agentConnections.size === 0) {
        this.connections.delete(agentId)
      }
    }
  }

  send(agentId: string, userId: string, event: string, data: unknown): void {
    const agentConnections = this.connections.get(agentId)
    if (!agentConnections) return

    const key = `${agentId}:${userId}`
    const conn = agentConnections.get(key)
    if (conn) {
      try {
        conn.send(event, data)
      } catch (error) {
        console.error('SSE send error:', error)
      }
    }
  }

  hasConnections(agentId: string, userId?: string): boolean {
    const agentConnections = this.connections.get(agentId)
    if (!agentConnections) return false
    if (userId) {
      return agentConnections.has(`${agentId}:${userId}`)
    }
    return agentConnections.size > 0
  }
}

export const sseManager = new SSEManager()

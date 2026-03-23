type SSEEventHandler = (event: string, data: unknown) => void

interface SSEConnection {
  send: SSEEventHandler
  close: () => void
}

class SSEManager {
  private connections = new Map<string, Set<SSEConnection>>()

  subscribe(agentId: string, connection: SSEConnection): () => void {
    if (!this.connections.has(agentId)) {
      this.connections.set(agentId, new Set())
    }
    this.connections.get(agentId)!.add(connection)

    return () => {
      this.connections.get(agentId)?.delete(connection)
      if (this.connections.get(agentId)?.size === 0) {
        this.connections.delete(agentId)
      }
    }
  }

  send(agentId: string, event: string, data: unknown): void {
    const connections = this.connections.get(agentId)
    if (connections) {
      connections.forEach(conn => {
        try {
          conn.send(event, data)
        } catch (error) {
          console.error('SSE send error:', error)
        }
      })
    }
  }

  hasConnections(agentId: string): boolean {
    const connections = this.connections.get(agentId)
    return connections !== undefined && connections.size > 0
  }
}

export const sseManager = new SSEManager()

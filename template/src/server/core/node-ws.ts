import type { WebSocket } from 'ws'
import { createRealtimeCore, type RealtimeCore, type WSClient, type RPCHandler, type EventHandler } from './realtime-core'
import { generateUUID } from '../utils/uuid'

class NodeWSClient implements WSClient {
  readonly id: string
  private ws: WebSocket

  constructor(ws: WebSocket) {
    this.id = generateUUID()
    this.ws = ws
  }

  get readyState(): number {
    return this.ws.readyState
  }

  send(data: unknown): void {
    if (this.ws.readyState === 1) {
      this.ws.send(JSON.stringify(data))
    }
  }

  close(): void {
    this.ws.close()
  }
}

export class NodeWSServer {
  private core: RealtimeCore
  private _clients: Map<string, NodeWSClient> = new Map()

  constructor() {
    this.core = createRealtimeCore()
  }

  get clients(): Map<string, NodeWSClient> {
    return this._clients
  }

  get size(): number {
    return this._clients.size
  }

  getConnectedClientsCount(): number {
    return this._clients.size
  }

  broadcast(data: unknown, exclude: string[] = [], event: string = 'notification'): void {
    this.core.broadcast(data, exclude, event)
  }

  registerRPCHandler(method: string, handler: RPCHandler): void {
    this.core.registerRPCHandler(method, handler)
  }

  registerEventHandler(type: string, handler: EventHandler): void {
    this.core.registerEventHandler(type, handler)
  }

  send(clientId: string, data: unknown): boolean {
    const client = this._clients.get(clientId)
    if (client && client.readyState === 1) {
      client.send(data)
      return true
    }
    return false
  }

  close(clientId: string): void {
    const client = this._clients.get(clientId)
    if (client) {
      client.close()
    }
  }

  handleConnection(ws: WebSocket): NodeWSClient {
    const client = new NodeWSClient(ws)

    ws.on('message', data => {
      try {
        const parsed = JSON.parse(data.toString())
        this.core.handleWSMessage(client.id, parsed)
      } catch {
        // Ignore invalid messages
      }
    })

    ws.on('close', () => {
      this._clients.delete(client.id)
      this.core.wsClients.delete(client.id)
    })

    this._clients.set(client.id, client)
    this.core.wsClients.set(client.id, client)

    client.send({
      type: 'connected',
      payload: { timestamp: Date.now() },
    })

    return client
  }
}

let _instance: NodeWSServer | null = null

export function getNodeWSServer(): NodeWSServer {
  if (!_instance) {
    _instance = new NodeWSServer()
  }
  return _instance
}

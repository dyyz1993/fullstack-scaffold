import { Hono, TypedResponse } from 'hono'
import { GhostWSProtocol } from '../../../shared/ws-protocol'
import { getWSAdapter } from '../../utils/ws-helper'
import { demoService } from '../services/demo-service'

/**
 * 💡 WebSocket 演示路由
 */
const route = new Hono().get(
  '/ws',
  async (c): Promise<Response & TypedResponse<GhostWSProtocol>> => {
    // 1. 鉴权校验
    const token = c.req.query('token') || c.req.header('Authorization')
    if (!token || token !== 'ghost-secret-token') {
      return c.json({ error: 'Unauthorized' } as any, 401)
    }

    // 2. 运行时升级 - 使用 Helper 获取适配器
    const upgradeAdapter = getWSAdapter<GhostWSProtocol>(c)

    if (!upgradeAdapter) {
      console.error('[WS] Upgrade adapter not found in context or env')
      return c.json({ error: 'WebSocket adapter not found' } as any, 500)
    }

    // 3. 直接使用 adapter，类型会自动推导
    return upgradeAdapter(c, {
      onMessage(evt, ws) {
        demoService.handleMessage(
          evt.data as string,
          msg => ws.send(msg),
          () => ws.readyState,
          () => ws.close()
        )
      },
    })
  }
)

export const wsDemoRoutes = route

import { IncomingMessage } from 'http'
import { WebSocketServer } from 'ws'

// 创建一个无服务器模式的 WSS 实例，专门处理升级逻辑
const wss = new WebSocketServer({ noServer: true })

// 导出 Node.js 原生 WebSocket 升级处理函数 (供 server/index.ts 使用)
export const handleUpgrade = (req: IncomingMessage, socket: any, head: any) => {
  // 简单的鉴权逻辑
  const url = new URL(req.url || '', 'http://localhost')
  const token = url.searchParams.get('token')

  if (token !== 'ghost-secret-token') {
    console.error('[WS Node] Unauthorized connection attempt')
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
    socket.destroy()
    return
  }

  wss.handleUpgrade(req, socket, head, ws => {
    // 处理连接成功后的逻辑
    ws.on('message', data => {
      demoService.handleMessage(
        data.toString(),
        msg => ws.send(msg),
        () => ws.readyState,
        () => ws.close()
      )
    })

    ws.on('error', e => console.error('[WS Node] Error:', e))
    console.log('[WS Node] Connection handled')
  })
}

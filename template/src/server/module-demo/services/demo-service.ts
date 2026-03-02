import { WSMessage, WSRpcRequest } from '../../../shared/ws-protocol'

export class DemoService {
  handleMessage(
    dataStr: string,
    send: (msg: string) => void,
    getReadyState: () => number,
    close: () => void
  ) {
    try {
      const data = JSON.parse(dataStr) as WSMessage

      // 处理 RPC 请求
      if ('id' in data && 'method' in data) {
        const req = data as WSRpcRequest
        if (req.method === 'get_browser_info') {
          send(
            JSON.stringify({
              id: req.id,
              result: { version: '1.0.0', status: 'idle', cpu: 0.12 },
            })
          )
        } else if (req.method === 'execute_command') {
          send(
            JSON.stringify({
              id: req.id,
              result: { success: true, output: `Executed: ${req.params.command}` },
            })
          )
        } else if (req.method === 'simulate_close') {
          // 模拟服务端主动断开
          send(
            JSON.stringify({
              id: req.id,
              result: { scheduled: true },
            })
          )

          const delay = req.params.delay || 100
          console.log(`[WS Node] Simulating close in ${delay}ms...`)
          setTimeout(() => {
            close()
          }, delay)
        }
      }
      // 处理客户端通知
      else if ('type' in data && data.type === 'client_ready') {
        send(
          JSON.stringify({
            type: 'server_log',
            payload: { level: 'info', message: 'WS Authenticated and Ready' },
          })
        )

        let progress = 0
        const timer = setInterval(() => {
          progress += 25

          // Check if socket is still open
          if (getReadyState() !== 1) {
            clearInterval(timer)
            return
          }

          send(
            JSON.stringify({
              type: 'task_progress',
              payload: { taskId: 'demo-1', progress },
            })
          )

          if (progress >= 100) clearInterval(timer)
        }, 1000)
      }
    } catch (e) {
      console.error('[WS] Message error:', e)
    }
  }
}

export const demoService = new DemoService()

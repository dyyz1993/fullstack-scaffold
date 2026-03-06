import { useSSE } from '@client/hooks'
import { apiClient } from '@client/services/apiClient'

export function NotificationListener() {
  const { isConnected, connect, disconnect } = useSSE(
    signal => apiClient.api.notifications.stream.$get({ signal }),
    {
      onNotification: _notification => {
        // Handle new notification
      },
      onError: _error => {
        // Handle SSE error
      },
      onConnect: () => {
        // SSE connected
      },
      onDisconnect: () => {
        // SSE disconnected
      },
    }
  )

  return (
    <div>
      <p>SSE Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      <button onClick={connect}>Connect</button>
      <button onClick={disconnect}>Disconnect</button>
    </div>
  )
}

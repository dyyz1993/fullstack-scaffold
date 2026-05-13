import type { ModuleManifest } from '@shared/core/module-manifest'

const chatManifest: ModuleManifest = {
  name: 'chat',
  description: 'Real-time chat with WebSocket RPC and event broadcasting',
  category: 'communication',
  dependsOn: [],

  routes: {
    client: {
      importPath: './routes/chat-routes',
      exportName: 'chatRoutes',
    },
  },

  sharedSchemas: {
    path: 'chat',
  },

  clientPages: [{ name: 'WebSocketPage', route: '/websocket' }],

  clientStores: ['chatWSStore'],

  hasWebSocket: true,
}

export default chatManifest

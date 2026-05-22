import type { ModuleManifest } from '@shared/core/module-manifest'

const notificationManifest: ModuleManifest = {
  name: 'notifications',
  description: 'Notification management with SSE real-time streaming',
  category: 'communication',
  dependsOn: [],

  routes: {
    client: {
      importPath: './routes/notification-routes',
      exportName: 'notificationRoutes',
    },
  },

  sharedSchemas: {
    path: 'notifications',
  },

  clientPages: [{ name: 'NotificationPage', route: '/notifications' }],

  clientStores: ['notificationStore'],

  dbSchemas: {
    files: ['notifications'],
    hasSeed: false,
  },

  hasSSE: true,

  cliModule: { dir: 'notification', registerFunction: 'registerNotificationCommands' },
}

export default notificationManifest

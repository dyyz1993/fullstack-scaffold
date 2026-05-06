import type { ModuleManifest } from '@shared/core/module-manifest'

const orderManifest: ModuleManifest = {
  name: 'order',
  description: 'Order management with process/cancel/complete workflow',
  category: 'business',
  dependsOn: ['permission'],

  routes: {
    admin: [
      {
        importPath: './routes/order-routes',
        exportName: 'orderRoutes',
      },
    ],
  },

  sharedSchemas: {
    path: 'order',
  },

  adminPages: [{ name: 'OrdersPage', route: '/orders', requiredPermission: 'ORDER_VIEW' }],

  dbSchemas: {
    files: ['orders'],
    hasSeed: true,
  },
}

export default orderManifest

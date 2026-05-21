import type { ModuleManifest } from '@shared/core/module-manifest'

const orderManifest: ModuleManifest = {
  name: 'order',
  description: 'Order management with process/cancel/complete workflow',
  category: 'business',
  dependsOn: ['permission'],

  routes: {
    client: [
      {
        importPath: './routes/cart-routes',
        exportName: 'cartRoutes',
      },
      {
        importPath: './routes/orders-mock-routes',
        exportName: 'ordersMockRoutes',
      },
    ],
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

  clientPages: [
    { name: 'CartPage', route: '/cart' },
    { name: 'OrdersPage', route: '/orders' },
  ],

  adminPages: [{ name: 'OrdersPage', route: '/orders', requiredPermission: 'ORDER_VIEW' }],

  dbSchemas: {
    files: ['orders'],
    hasSeed: true,
    seed: { serviceFile: 'order-service', functionName: 'seedOrdersIfEmpty' },
  },

  cliModule: { dir: 'order', registerFunction: 'registerOrderCommands' },
}

export default orderManifest

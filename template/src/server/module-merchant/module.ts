import type { ModuleManifest } from '@shared/core/module-manifest'

const merchantManifest: ModuleManifest = {
  name: 'merchant',
  description: 'Merchant management module with product management',
  category: 'business',
  dependsOn: ['auth', 'permission'],

  routes: {
    client: [
      {
        importPath: './routes/merchant-routes',
        exportName: 'apiRoutes',
      },
    ],
  },

  sharedSchemas: {
    path: 'merchant',
  },

  clientPages: [],

  clientStores: [],

  dbSchemas: {
    files: ['merchants', 'products'],
    hasSeed: true,
  },
}

export default merchantManifest

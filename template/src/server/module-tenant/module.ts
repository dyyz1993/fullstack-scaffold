import type { ModuleManifest } from '@shared/core/module-manifest'

const tenantManifest: ModuleManifest = {
  name: 'tenant',
  description: 'Multi-tenant infrastructure with tenant isolation and management',
  category: 'system',
  dependsOn: ['auth', 'permission'],

  routes: {
    client: [
      {
        importPath: './routes/tenant-routes',
        exportName: 'apiRoutes',
      },
    ],
  },

  sharedSchemas: {
    path: 'tenant',
  },

  clientPages: [],

  dbSchemas: {
    files: ['tenants'],
    hasSeed: true,
    seed: { serviceFile: 'tenant-service', functionName: 'seedTenantsIfEmpty' },
  },
}

export default tenantManifest

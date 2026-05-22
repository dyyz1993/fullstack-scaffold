// template/src/server/module-{name}/module.ts
import type { ModuleManifest } from '@shared/core/module-manifest'

const {name}Manifest: ModuleManifest = {
  name: '{name}',
  description: '{Description of what this module does}',
  category: 'core', // 'core' | 'communication' | 'business' | 'system'
  dependsOn: [],

  routes: {
    client: {
      mountPath: '/api',
      file: 'routes/{name}-routes.ts',
      exportName: 'apiRoutes',
    },
    // admin: {
    //   mountPath: '/api',
    //   file: 'routes/admin-{name}-routes.ts',
    //   exportName: 'adminRoutes',
    // },
    // standalone: {
    //   mountPath: '/api/{names}',
    //   file: 'routes/{name}-routes.ts',
    //   exportName: 'apiRoutes',
    // },
  },

  sharedSchemas: ['{name}'],

  clientPages: [
    { name: '{Name}Page', path: '/{names}' },
  ],

  clientStores: ['{name}'],

  // adminPages: [
  //   { name: '{Name}Page', path: '/{names}', requiredPermission: 'manage_{names}' },
  // ],

  dbSchemas: {
    files: ['{name}'],
  },

  providesMiddleware: [],

  hasSSE: false,
  hasWebSocket: false,
}

export default {name}Manifest

import type { ModuleManifest } from '@shared/core/module-manifest'

const authManifest: ModuleManifest = {
  name: 'auth',
  description: 'Developer authentication with registration, login, and API key management',
  category: 'system',
  dependsOn: [],

  routes: {
    client: {
      importPath: './routes/auth-routes',
      exportName: 'authRoutes',
    },
  },

  sharedSchemas: {
    path: 'auth',
  },

  clientStores: ['authStore'],

  clientPages: [
    { name: 'LoginPage', route: '/login' },
    { name: 'RegisterPage', route: '/register' },
  ],

  dbSchemas: {
    files: ['developers'],
    hasSeed: false,
  },
}

export default authManifest

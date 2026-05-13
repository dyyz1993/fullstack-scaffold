import type { ModuleManifest } from '@shared/core/module-manifest'

const pluginManifest: ModuleManifest = {
  name: 'plugin',
  description:
    'Plugin marketplace with CRUD, publishing, reviews, categories, and admin management',
  category: 'business',
  dependsOn: ['permission'],

  routes: {
    client: {
      importPath: './routes/plugin-routes',
      exportName: 'pluginRoutes',
    },
    admin: [
      {
        importPath: './routes/plugin-admin-routes',
        exportName: 'pluginAdminRoutes',
      },
    ],
  },

  sharedSchemas: {
    path: 'plugins',
  },

  clientPages: [
    { name: 'PluginsPage', route: '/plugins' },
    { name: 'PluginDetailPage', route: '/plugins/:slug' },
    { name: 'CategoriesPage', route: '/categories' },
    { name: 'SearchPage', route: '/search' },
    { name: 'PublishPage', route: '/publish' },
    { name: 'DeveloperDashboardPage', route: '/developer' },
  ],

  adminPages: [
    { name: 'PluginManagementPage', route: '/admin/plugins' },
    { name: 'PluginReviewPage', route: '/admin/plugins/review' },
    { name: 'CategoryManagementPage', route: '/admin/categories' },
    { name: 'PluginDashboardPage', route: '/admin/plugins/dashboard' },
  ],

  clientStores: ['pluginStore'],

  dbSchemas: {
    files: ['plugins'],
    hasSeed: true,
  },
}

export default pluginManifest

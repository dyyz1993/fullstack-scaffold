import type { ModuleManifest } from '@shared/core/module-manifest'

const contentManifest: ModuleManifest = {
  name: 'content',
  description: 'Content management with publish/archive workflow and permission guards',
  category: 'business',
  dependsOn: ['permission'],

  routes: {
    admin: [
      {
        importPath: './routes/content-routes',
        exportName: 'contentRoutes',
      },
    ],
  },

  sharedSchemas: {
    path: 'content',
  },

  adminPages: [{ name: 'ContentPage', route: '/content', requiredPermission: 'CONTENT_VIEW' }],

  dbSchemas: {
    files: ['contents'],
    hasSeed: true,
  },
}

export default contentManifest

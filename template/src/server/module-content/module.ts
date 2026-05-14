import type { ModuleManifest } from '@shared/core/module-manifest'

const contentManifest: ModuleManifest = {
  name: 'content',
  description: 'Content management with publish/archive workflow and permission guards',
  category: 'business',
  dependsOn: ['permission'],

  routes: {
    client: [
      {
        importPath: './routes/public-content-routes',
        exportName: 'publicContentRoutes',
      },
      {
        importPath: './routes/topics-routes',
        exportName: 'topicsRoutes',
      },
    ],
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

  clientPages: [
    { name: 'ContentListPage', route: '/content' },
    { name: 'ContentDetailPage', route: '/content/:id' },
  ],

  adminPages: [{ name: 'ContentPage', route: '/content', requiredPermission: 'CONTENT_VIEW' }],

  dbSchemas: {
    files: ['contents'],
    hasSeed: true,
  },
}

export default contentManifest

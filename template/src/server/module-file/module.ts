import type { ModuleManifest } from '@shared/core/module-manifest'

const fileManifest: ModuleManifest = {
  name: 'file',
  description: 'File upload, storage, and signed URL generation',
  category: 'system',
  dependsOn: [],

  routes: {
    admin: [
      {
        importPath: './routes/file-routes',
        exportName: 'fileRoutes',
      },
    ],
    standalone: {
      importPath: './routes/file-routes',
      exportName: 'fileRoutes',
      mountPath: '/files',
    },
  },

  sharedSchemas: {
    path: 'files',
  },
}

export default fileManifest

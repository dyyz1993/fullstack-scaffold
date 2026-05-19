import type { ModuleManifest } from '@shared/core/module-manifest'

const disputeManifest: ModuleManifest = {
  name: 'dispute',
  description: 'Dispute management with investigate/resolve/reject workflow',
  category: 'business',
  dependsOn: ['permission'],

  routes: {
    admin: [
      {
        importPath: './routes/dispute-routes',
        exportName: 'disputeRoutes',
      },
    ],
  },

  sharedSchemas: {
    path: 'dispute',
  },

  adminPages: [{ name: 'DisputesPage', route: '/disputes', requiredPermission: 'DISPUTE_VIEW' }],

  dbSchemas: {
    files: ['disputes'],
    hasSeed: true,
    seed: { serviceFile: 'dispute-service', functionName: 'seedDisputesIfEmpty' },
  },
}

export default disputeManifest

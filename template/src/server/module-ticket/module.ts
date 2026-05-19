import type { ModuleManifest } from '@shared/core/module-manifest'

const ticketManifest: ModuleManifest = {
  name: 'ticket',
  description: 'Support ticket management with reply/close workflow',
  category: 'business',
  dependsOn: ['permission'],

  routes: {
    admin: [
      {
        importPath: './routes/ticket-routes',
        exportName: 'ticketRoutes',
      },
    ],
  },

  sharedSchemas: {
    path: 'ticket',
  },

  adminPages: [{ name: 'TicketsPage', route: '/tickets', requiredPermission: 'TICKET_VIEW' }],

  dbSchemas: {
    files: ['tickets'],
    hasSeed: true,
    seed: { serviceFile: 'ticket-service', functionName: 'seedTicketsIfEmpty' },
  },
}

export default ticketManifest

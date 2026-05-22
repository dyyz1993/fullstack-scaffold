import type { ModuleManifest } from '@shared/core/module-manifest'

const permissionManifest: ModuleManifest = {
  name: 'permission',
  description: 'Role-based access control, permission management, and audit logging',
  category: 'system',
  dependsOn: [],

  routes: {
    admin: [
      {
        importPath: './routes/permission-routes',
        exportName: 'permissionRoutes',
      },
      {
        importPath: './routes/role-routes',
        exportName: 'roleRoutes',
      },
      {
        importPath: './routes/audit-log-routes',
        exportName: 'auditLogRoutes',
      },
    ],
  },

  sharedSchemas: {
    path: 'permission',
    additionalPaths: ['role', 'audit'],
  },

  adminPages: [
    {
      name: 'PermissionsPage',
      route: '/system/permissions',
      requiredPermission: 'SYSTEM_MANAGE_PERMISSIONS',
    },
    { name: 'RolesPage', route: '/system/roles', requiredPermission: 'ROLE_MANAGE' },
    { name: 'SystemLogsPage', route: '/system/logs' },
  ],

  dbSchemas: {
    files: [
      'permissions',
      'roles',
      'role-permissions',
      'user-roles',
      'permission-audit-logs',
      'permission-route-mappings',
      'api-endpoints',
    ],
    hasSeed: false,
  },

  providesMiddleware: [
    {
      name: 'permission',
      importPath: './middleware/permission',
      appliesTo: 'all-api',
    },
    {
      name: 'audit-log',
      importPath: './middleware/audit-log',
      appliesTo: 'all-api',
    },
  ],

  cliModule: { dir: 'permission', registerFunction: 'registerPermissionCommands' },
}

export default permissionManifest

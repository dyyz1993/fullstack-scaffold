import type { ModuleManifest } from '@shared/core/module-manifest'

const adminManifest: ModuleManifest = {
  name: 'admin',
  description:
    'Admin panel with auth, user management, system stats, media serving, CSV export, and admin notifications',
  category: 'system',
  dependsOn: ['permission', 'notifications'],

  routes: {
    client: {
      importPath: './routes/client-auth-routes',
      exportName: 'clientAuthRoutes',
    },
    admin: [
      {
        importPath: './routes/admin-routes',
        exportName: 'adminRoutes',
      },
    ],
  },

  sharedSchemas: {
    path: 'admin',
  },

  adminPages: [
    { name: 'LoginPage', route: '/login', isPublic: true },
    { name: 'RegisterPage', route: '/register', isPublic: true },
    { name: 'DashboardPage', route: '/dashboard' },
    { name: 'UsersPage', route: '/users', requiredPermission: 'USER_VIEW' },
    { name: 'SettingsPage', route: '/system/settings' },
    { name: 'MediaTestPage', route: '/test/media' },
  ],

  hasSSE: true,
}

export default adminManifest

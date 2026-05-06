import type { ModuleManifest } from '@shared/core/module-manifest'

const adminManifest: ModuleManifest = {
  name: 'admin',
  description:
    'Admin panel with auth, user management, system stats, media serving, CSV export, and admin notifications',
  category: 'system',
  dependsOn: ['permission', 'notifications'],

  routes: {
    admin: [
      {
        importPath: './routes/admin-routes',
        exportName: 'adminRoutes',
      },
    ],
    // Note: admin-routes.ts is an aggregator that composes sub-routes:
    // auth-routes (login/register/me), user-management-routes, admin-notification-routes,
    // media-routes (avatar/svg), export-routes (CSV), system-routes (stats/health/activity)
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

  clientStores: ['authStore'],

  hasSSE: true,
}

export default adminManifest

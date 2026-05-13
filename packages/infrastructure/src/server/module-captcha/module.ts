import type { ModuleManifest } from '@shared/core/module-manifest'

const captchaManifest: ModuleManifest = {
  name: 'captcha',
  description: 'CAPTCHA generation and verification for anti-bot protection',
  category: 'system',
  dependsOn: [],

  routes: {
    admin: [
      {
        importPath: './routes/captcha-routes',
        exportName: 'captchaRoutes',
      },
    ],
  },

  sharedSchemas: {
    path: 'captcha',
  },

  adminPages: [{ name: 'TestCaptchaPage', route: '/test/captcha' }],

  dbSchemas: undefined,

  providesMiddleware: [
    {
      name: 'captcha',
      importPath: './middleware/captcha',
      appliesTo: 'admin-api',
    },
  ],
}

export default captchaManifest

import { getDb } from './driver'
import { permissions, roles, rolePermissions } from './schema'
import { developers } from './schema/developers'
import { logger } from '../utils/logger'
import { generateUUID } from '../utils/uuid'
import { hash } from 'bcryptjs'

const log = logger.db()

const initialPermissions = [
  {
    id: 'perm_user_view',
    code: 'user:view',
    name: '查看用户',
    label: '查看用户',
    category: 'user',
    sortOrder: 1,
  },
  {
    id: 'perm_user_create',
    code: 'user:create',
    name: '创建用户',
    label: '创建用户',
    category: 'user',
    sortOrder: 2,
  },
  {
    id: 'perm_user_edit',
    code: 'user:edit',
    name: '编辑用户',
    label: '编辑用户',
    category: 'user',
    sortOrder: 3,
  },
  {
    id: 'perm_user_delete',
    code: 'user:delete',
    name: '删除用户',
    label: '删除用户',
    category: 'user',
    sortOrder: 4,
  },
  {
    id: 'perm_content_view',
    code: 'content:view',
    name: '查看内容',
    label: '查看内容',
    category: 'content',
    sortOrder: 1,
  },
  {
    id: 'perm_content_create',
    code: 'content:create',
    name: '创建内容',
    label: '创建内容',
    category: 'content',
    sortOrder: 2,
  },
  {
    id: 'perm_content_edit',
    code: 'content:edit',
    name: '编辑内容',
    label: '编辑内容',
    category: 'content',
    sortOrder: 3,
  },
  {
    id: 'perm_content_delete',
    code: 'content:delete',
    name: '删除内容',
    label: '删除内容',
    category: 'content',
    sortOrder: 4,
  },
  {
    id: 'perm_system_settings',
    code: 'system:settings',
    name: '系统设置',
    label: '系统设置',
    category: 'system',
    sortOrder: 1,
  },
  {
    id: 'perm_system_logs',
    code: 'system:logs',
    name: '系统日志',
    label: '系统日志',
    category: 'system',
    sortOrder: 2,
  },
  {
    id: 'perm_system_monitor',
    code: 'system:monitor',
    name: '系统监控',
    label: '系统监控',
    category: 'system',
    sortOrder: 3,
  },
  {
    id: 'perm_data_export',
    code: 'data:export',
    name: '数据导出',
    label: '数据导出',
    category: 'data',
    sortOrder: 1,
  },
  {
    id: 'perm_data_import',
    code: 'data:import',
    name: '数据导入',
    label: '数据导入',
    category: 'data',
    sortOrder: 2,
  },
  {
    id: 'perm_order_view',
    code: 'order:view',
    name: '查看订单',
    label: '查看订单',
    category: 'order',
    sortOrder: 1,
  },
  {
    id: 'perm_order_create',
    code: 'order:create',
    name: '创建订单',
    label: '创建订单',
    category: 'order',
    sortOrder: 2,
  },
  {
    id: 'perm_order_edit',
    code: 'order:edit',
    name: '编辑订单',
    label: '编辑订单',
    category: 'order',
    sortOrder: 3,
  },
  {
    id: 'perm_order_delete',
    code: 'order:delete',
    name: '删除订单',
    label: '删除订单',
    category: 'order',
    sortOrder: 4,
  },
  {
    id: 'perm_order_process',
    code: 'order:process',
    name: '处理订单',
    label: '处理订单',
    category: 'order',
    sortOrder: 5,
  },
  {
    id: 'perm_ticket_view',
    code: 'ticket:view',
    name: '查看工单',
    label: '查看工单',
    category: 'ticket',
    sortOrder: 1,
  },
  {
    id: 'perm_ticket_create',
    code: 'ticket:create',
    name: '创建工单',
    label: '创建工单',
    category: 'ticket',
    sortOrder: 2,
  },
  {
    id: 'perm_ticket_edit',
    code: 'ticket:edit',
    name: '编辑工单',
    label: '编辑工单',
    category: 'ticket',
    sortOrder: 3,
  },
  {
    id: 'perm_ticket_delete',
    code: 'ticket:delete',
    name: '删除工单',
    label: '删除工单',
    category: 'ticket',
    sortOrder: 4,
  },
  {
    id: 'perm_ticket_reply',
    code: 'ticket:reply',
    name: '回复工单',
    label: '回复工单',
    category: 'ticket',
    sortOrder: 5,
  },
  {
    id: 'perm_ticket_close',
    code: 'ticket:close',
    name: '关闭工单',
    label: '关闭工单',
    category: 'ticket',
    sortOrder: 6,
  },
  {
    id: 'perm_dispute_view',
    code: 'dispute:view',
    name: '查看争议',
    label: '查看争议',
    category: 'dispute',
    sortOrder: 1,
  },
  {
    id: 'perm_dispute_create',
    code: 'dispute:create',
    name: '创建争议',
    label: '创建争议',
    category: 'dispute',
    sortOrder: 2,
  },
  {
    id: 'perm_dispute_edit',
    code: 'dispute:edit',
    name: '编辑争议',
    label: '编辑争议',
    category: 'dispute',
    sortOrder: 3,
  },
  {
    id: 'perm_dispute_delete',
    code: 'dispute:delete',
    name: '删除争议',
    label: '删除争议',
    category: 'dispute',
    sortOrder: 4,
  },
  {
    id: 'perm_dispute_resolve',
    code: 'dispute:resolve',
    name: '解决争议',
    label: '解决争议',
    category: 'dispute',
    sortOrder: 5,
  },
  {
    id: 'perm_role_view',
    code: 'role:view',
    name: '查看角色',
    label: '查看角色',
    category: 'role',
    sortOrder: 1,
  },
  {
    id: 'perm_role_create',
    code: 'role:create',
    name: '创建角色',
    label: '创建角色',
    category: 'role',
    sortOrder: 2,
  },
  {
    id: 'perm_role_edit',
    code: 'role:edit',
    name: '编辑角色',
    label: '编辑角色',
    category: 'role',
    sortOrder: 3,
  },
  {
    id: 'perm_role_delete',
    code: 'role:delete',
    name: '删除角色',
    label: '删除角色',
    category: 'role',
    sortOrder: 4,
  },
]

const initialRoles = [
  {
    id: 'role_super_admin',
    code: 'super_admin',
    name: '超级管理员',
    label: '超级管理员',
    isSystem: true,
    sortOrder: 1,
  },
  {
    id: 'role_customer_service',
    code: 'customer_service',
    name: '客服人员',
    label: '客服人员',
    isSystem: true,
    sortOrder: 2,
  },
  {
    id: 'role_user',
    code: 'user',
    name: '普通用户',
    label: '普通用户',
    isSystem: true,
    sortOrder: 3,
  },
]

const initialRolePermissions = [
  { roleId: 'role_super_admin', permissionId: 'perm_user_view' },
  { roleId: 'role_super_admin', permissionId: 'perm_user_create' },
  { roleId: 'role_super_admin', permissionId: 'perm_user_edit' },
  { roleId: 'role_super_admin', permissionId: 'perm_user_delete' },
  { roleId: 'role_super_admin', permissionId: 'perm_content_view' },
  { roleId: 'role_super_admin', permissionId: 'perm_content_create' },
  { roleId: 'role_super_admin', permissionId: 'perm_content_edit' },
  { roleId: 'role_super_admin', permissionId: 'perm_content_delete' },
  { roleId: 'role_super_admin', permissionId: 'perm_system_settings' },
  { roleId: 'role_super_admin', permissionId: 'perm_system_logs' },
  { roleId: 'role_super_admin', permissionId: 'perm_system_monitor' },
  { roleId: 'role_super_admin', permissionId: 'perm_data_export' },
  { roleId: 'role_super_admin', permissionId: 'perm_data_import' },
  { roleId: 'role_super_admin', permissionId: 'perm_order_view' },
  { roleId: 'role_super_admin', permissionId: 'perm_order_create' },
  { roleId: 'role_super_admin', permissionId: 'perm_order_edit' },
  { roleId: 'role_super_admin', permissionId: 'perm_order_delete' },
  { roleId: 'role_super_admin', permissionId: 'perm_order_process' },
  { roleId: 'role_super_admin', permissionId: 'perm_ticket_view' },
  { roleId: 'role_super_admin', permissionId: 'perm_ticket_create' },
  { roleId: 'role_super_admin', permissionId: 'perm_ticket_edit' },
  { roleId: 'role_super_admin', permissionId: 'perm_ticket_delete' },
  { roleId: 'role_super_admin', permissionId: 'perm_ticket_reply' },
  { roleId: 'role_super_admin', permissionId: 'perm_ticket_close' },
  { roleId: 'role_super_admin', permissionId: 'perm_dispute_view' },
  { roleId: 'role_super_admin', permissionId: 'perm_dispute_create' },
  { roleId: 'role_super_admin', permissionId: 'perm_dispute_edit' },
  { roleId: 'role_super_admin', permissionId: 'perm_dispute_delete' },
  { roleId: 'role_super_admin', permissionId: 'perm_dispute_resolve' },
  { roleId: 'role_customer_service', permissionId: 'perm_content_view' },
  { roleId: 'role_customer_service', permissionId: 'perm_order_view' },
  { roleId: 'role_customer_service', permissionId: 'perm_order_create' },
  { roleId: 'role_customer_service', permissionId: 'perm_order_edit' },
  { roleId: 'role_customer_service', permissionId: 'perm_order_delete' },
  { roleId: 'role_customer_service', permissionId: 'perm_order_process' },
  { roleId: 'role_customer_service', permissionId: 'perm_ticket_view' },
  { roleId: 'role_customer_service', permissionId: 'perm_ticket_create' },
  { roleId: 'role_customer_service', permissionId: 'perm_ticket_edit' },
  { roleId: 'role_customer_service', permissionId: 'perm_ticket_delete' },
  { roleId: 'role_customer_service', permissionId: 'perm_ticket_reply' },
  { roleId: 'role_customer_service', permissionId: 'perm_ticket_close' },
  { roleId: 'role_customer_service', permissionId: 'perm_dispute_view' },
  { roleId: 'role_customer_service', permissionId: 'perm_dispute_create' },
  { roleId: 'role_customer_service', permissionId: 'perm_dispute_edit' },
  { roleId: 'role_customer_service', permissionId: 'perm_dispute_delete' },
  { roleId: 'role_customer_service', permissionId: 'perm_dispute_resolve' },
  { roleId: 'role_customer_service', permissionId: 'perm_data_export' },
  { roleId: 'role_customer_service', permissionId: 'perm_system_logs' },
  { roleId: 'role_user', permissionId: 'perm_content_view' },
  { roleId: 'role_user', permissionId: 'perm_order_view' },
]

async function seedDevelopersIfEmpty() {
  try {
    const db = await getDb()

    const existing = await db.select().from(developers)
    if (existing.length > 0) return

    log.info({}, 'Seeding developers...')

    const demoPasswordHash = await hash('demo123')
    const adminPasswordHash = await hash('admin123')

    const sampleDevelopers = [
      {
        id: generateUUID(),
        username: 'demo',
        email: 'demo@biomimic.app',
        passwordHash: demoPasswordHash,
        role: 'developer',
        apiKey: generateUUID(),
      },
      {
        id: generateUUID(),
        username: 'superadmin',
        email: 'admin@biomimic.app',
        passwordHash: adminPasswordHash,
        role: 'admin',
        apiKey: generateUUID(),
      },
    ]

    await db.insert(developers).values(sampleDevelopers)

    log.info({}, 'Developers seeding complete!')
  } catch (error) {
    // 如果表不存在，忽略错误（可能在某些模板中不需要 developers 表）
    if (
      error instanceof Error &&
      (error.message.includes('no such table') || error.message.includes('does not exist'))
    ) {
      log.debug({}, 'Developers table not found, skipping seed')
      return
    }
    throw error
  }
}

async function seedPluginsIfEmpty() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic import for presets that may not have plugin module
  let plugins: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pluginVersions: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pluginCategories: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pluginCategoryMappings: any
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schema = (await import('./schema')) as Record<string, any>
    plugins = schema.plugins
    pluginVersions = schema.pluginVersions
    pluginCategories = schema.pluginCategories
    pluginCategoryMappings = schema.pluginCategoryMappings
    if (!plugins) return
  } catch {
    return
  }

  const db = await getDb()

  const existing = await db.select().from(plugins)
  if (existing.length > 0) return

  log.info({}, 'Seeding plugins...')

  const sampleCategories = [
    {
      id: generateUUID(),
      name: 'UI & Design',
      slug: 'ui-design',
      description: 'Visual customization and theming',
      icon: 'palette',
      sortOrder: 1,
    },
    {
      id: generateUUID(),
      name: 'Analytics',
      slug: 'analytics',
      description: 'Data tracking and reporting',
      icon: 'chart',
      sortOrder: 2,
    },
    {
      id: generateUUID(),
      name: 'SEO & Marketing',
      slug: 'seo-marketing',
      description: 'Search optimization and growth tools',
      icon: 'trending-up',
      sortOrder: 3,
    },
    {
      id: generateUUID(),
      name: 'Developer Tools',
      slug: 'developer-tools',
      description: 'Utilities for developers',
      icon: 'code',
      sortOrder: 4,
    },
    {
      id: generateUUID(),
      name: 'Integration',
      slug: 'integration',
      description: 'Third-party service integrations',
      icon: 'plug',
      sortOrder: 5,
    },
  ]

  await db.insert(pluginCategories).values(sampleCategories)

  const samplePlugins = [
    {
      id: generateUUID(),
      name: 'Theme Engine',
      slug: 'theme-engine',
      description:
        'Advanced theming system with dark mode, custom color palettes, and responsive layout controls.',
      readme:
        '# Theme Engine\n\nA powerful theming plugin for customizing the look and feel of your application.',
      authorId: '1',
      authorName: 'superadmin',
      repositoryUrl: 'https://github.com/example/theme-engine',
      homepageUrl: 'https://theme-engine.example.com',
      license: 'MIT',
      version: '2.1.0',
      status: 'approved' as const,
      downloadCount: 1520,
      viewCount: 4320,
      featured: true,
      screenshotUrl: 'https://picsum.photos/seed/theme/800/400',
      tags: '["theme","dark-mode","customization"]',
    },
    {
      id: generateUUID(),
      slug: 'analytics-dashboard',
      name: 'Analytics Dashboard',
      description:
        'Real-time analytics dashboard with charts, heatmaps, and user behavior tracking.',
      readme: '# Analytics Dashboard\n\nTrack user engagement and visualize data in real time.',
      authorId: '1',
      authorName: 'superadmin',
      repositoryUrl: 'https://github.com/example/analytics-dashboard',
      homepageUrl: 'https://analytics.example.com',
      license: 'Apache-2.0',
      version: '1.5.3',
      status: 'approved' as const,
      downloadCount: 980,
      viewCount: 2100,
      featured: true,
      screenshotUrl: 'https://picsum.photos/seed/analytics/800/400',
      tags: '["analytics","dashboard","charts"]',
    },
    {
      id: generateUUID(),
      slug: 'seo-optimizer',
      name: 'SEO Optimizer',
      description:
        'Automated SEO optimization with meta tags, sitemap generation, and structured data support.',
      authorId: '2',
      authorName: 'customerservice',
      repositoryUrl: 'https://github.com/example/seo-optimizer',
      license: 'MIT',
      version: '1.2.0',
      status: 'approved' as const,
      downloadCount: 740,
      viewCount: 1800,
      featured: false,
      screenshotUrl: 'https://picsum.photos/seed/seo/800/400',
      tags: '["seo","meta","sitemap"]',
    },
    {
      id: generateUUID(),
      slug: 'api-toolkit',
      name: 'API Toolkit',
      description:
        'Developer toolkit for building and testing REST APIs with auto-documentation and mock servers.',
      authorId: '2',
      authorName: 'customerservice',
      repositoryUrl: 'https://github.com/example/api-toolkit',
      homepageUrl: 'https://api-toolkit.example.com',
      license: 'MIT',
      version: '3.0.1',
      status: 'approved' as const,
      downloadCount: 2100,
      viewCount: 5600,
      featured: true,
      screenshotUrl: 'https://picsum.photos/seed/apitoolkit/800/400',
      tags: '["api","developer","testing","documentation"]',
    },
    {
      id: generateUUID(),
      slug: 'notification-hub',
      name: 'Notification Hub',
      description:
        'Unified notification management supporting email, SMS, push, and in-app notifications.',
      authorId: '3',
      authorName: 'user1',
      repositoryUrl: 'https://github.com/example/notification-hub',
      license: 'ISC',
      version: '1.0.0',
      status: 'pending' as const,
      downloadCount: 0,
      viewCount: 50,
      featured: false,
      screenshotUrl: 'https://picsum.photos/seed/notify/800/400',
      tags: '["notification","email","push"]',
    },
    {
      id: generateUUID(),
      slug: 'form-builder',
      name: 'Form Builder',
      description:
        'Drag-and-drop form creation with validation rules, conditional logic, and file uploads.',
      readme:
        '# Form Builder\n\nCreate complex forms with ease using our visual drag-and-drop builder.',
      authorId: '1',
      authorName: 'superadmin',
      repositoryUrl: 'https://github.com/example/form-builder',
      homepageUrl: 'https://form-builder.example.com',
      license: 'MIT',
      version: '3.2.1',
      status: 'approved' as const,
      downloadCount: 3420,
      viewCount: 8900,
      featured: true,
      screenshotUrl: 'https://picsum.photos/seed/formbuilder/800/400',
      tags: '["forms","validation","drag-drop"]',
    },
    {
      id: generateUUID(),
      slug: 'image-optimizer',
      name: 'Image Optimizer',
      description:
        'Automatic image compression and format conversion with lazy loading and responsive srcset support.',
      readme: '# Image Optimizer\n\nOptimize images automatically for faster page loads.',
      authorId: '2',
      authorName: 'customerservice',
      repositoryUrl: 'https://github.com/example/image-optimizer',
      license: 'MIT',
      version: '2.0.0',
      status: 'approved' as const,
      downloadCount: 2890,
      viewCount: 6500,
      featured: false,
      screenshotUrl: 'https://picsum.photos/seed/imgopt/800/400',
      tags: '["image","optimization","performance"]',
    },
    {
      id: generateUUID(),
      slug: 'cache-manager',
      name: 'Cache Manager',
      description:
        'Redis-powered caching layer with TTL management, cache invalidation, and tag-based purging.',
      readme: '# Cache Manager\n\nSmart caching for high-performance applications.',
      authorId: '1',
      authorName: 'superadmin',
      repositoryUrl: 'https://github.com/example/cache-manager',
      homepageUrl: 'https://cache-manager.example.com',
      license: 'Apache-2.0',
      version: '1.8.0',
      status: 'approved' as const,
      downloadCount: 1560,
      viewCount: 4200,
      featured: true,
      screenshotUrl: 'https://picsum.photos/seed/cache/800/400',
      tags: '["cache","redis","performance"]',
    },
    {
      id: generateUUID(),
      slug: 'auth-guard',
      name: 'Auth Guard',
      description:
        'Advanced authentication flows with OAuth2, SAML, and biometric support including session management.',
      readme: '# Auth Guard\n\nEnterprise-grade authentication for modern apps.',
      authorId: '1',
      authorName: 'superadmin',
      repositoryUrl: 'https://github.com/example/auth-guard',
      homepageUrl: 'https://auth-guard.example.com',
      license: 'MIT',
      version: '4.1.0',
      status: 'approved' as const,
      downloadCount: 4210,
      viewCount: 9800,
      featured: true,
      screenshotUrl: 'https://picsum.photos/seed/authguard/800/400',
      tags: '["auth","oauth","security"]',
    },
    {
      id: generateUUID(),
      slug: 'payment-gateway',
      name: 'Payment Gateway',
      description:
        'Stripe and PayPal integration with subscription management, invoicing, and refund handling.',
      readme: '# Payment Gateway\n\nAccept payments globally with multiple providers.',
      authorId: '2',
      authorName: 'customerservice',
      repositoryUrl: 'https://github.com/example/payment-gateway',
      homepageUrl: 'https://payment-gateway.example.com',
      license: 'MIT',
      version: '2.3.0',
      status: 'approved' as const,
      downloadCount: 3100,
      viewCount: 7800,
      featured: true,
      screenshotUrl: 'https://picsum.photos/seed/payment/800/400',
      tags: '["payment","stripe","subscription"]',
    },
    {
      id: generateUUID(),
      slug: 'chat-widget',
      name: 'Chat Widget',
      description:
        'Real-time customer support chat with AI-powered auto-replies and conversation routing.',
      readme: '# Chat Widget\n\nLive chat support for your customers.',
      authorId: '3',
      authorName: 'user1',
      repositoryUrl: 'https://github.com/example/chat-widget',
      license: 'ISC',
      version: '1.4.2',
      status: 'approved' as const,
      downloadCount: 1870,
      viewCount: 5200,
      featured: false,
      screenshotUrl: 'https://picsum.photos/seed/chatwidget/800/400',
      tags: '["chat","support","real-time"]',
    },
    {
      id: generateUUID(),
      slug: 'backup-manager',
      name: 'Backup Manager',
      description:
        'Automated database backups with scheduling, encryption, and cloud storage integration.',
      readme: '# Backup Manager\n\nNever lose data with automated backups.',
      authorId: '1',
      authorName: 'superadmin',
      repositoryUrl: 'https://github.com/example/backup-manager',
      license: 'MIT',
      version: '1.1.0',
      status: 'approved' as const,
      downloadCount: 980,
      viewCount: 2900,
      featured: false,
      screenshotUrl: 'https://picsum.photos/seed/backup/800/400',
      tags: '["backup","database","scheduling"]',
    },
    {
      id: generateUUID(),
      slug: 'rate-limiter',
      name: 'Rate Limiter',
      description:
        'API rate limiting middleware with sliding window, token bucket, and fixed window algorithms.',
      readme: '# Rate Limiter\n\nProtect your APIs from abuse.',
      authorId: '2',
      authorName: 'customerservice',
      repositoryUrl: 'https://github.com/example/rate-limiter',
      homepageUrl: 'https://rate-limiter.example.com',
      license: 'MIT',
      version: '2.0.0',
      status: 'approved' as const,
      downloadCount: 1340,
      viewCount: 3800,
      featured: false,
      screenshotUrl: 'https://picsum.photos/seed/ratelimit/800/400',
      tags: '["rate-limit","api","middleware"]',
    },
    {
      id: generateUUID(),
      slug: 'email-templates',
      name: 'Email Templates',
      description:
        'Responsive email builder with template variables, preview mode, and SMTP integration.',
      readme: '# Email Templates\n\nBeautiful emails that work everywhere.',
      authorId: '3',
      authorName: 'user1',
      repositoryUrl: 'https://github.com/example/email-templates',
      license: 'Apache-2.0',
      version: '1.6.0',
      status: 'approved' as const,
      downloadCount: 2100,
      viewCount: 5600,
      featured: false,
      screenshotUrl: 'https://picsum.photos/seed/emailtpl/800/400',
      tags: '["email","templates","smtp"]',
    },
    {
      id: generateUUID(),
      slug: 'search-engine',
      name: 'Search Engine',
      description:
        'Elasticsearch integration with faceted search, autocomplete, and relevance tuning.',
      readme: '# Search Engine\n\nPowerful full-text search for your application.',
      authorId: '1',
      authorName: 'superadmin',
      repositoryUrl: 'https://github.com/example/search-engine',
      homepageUrl: 'https://search-engine.example.com',
      license: 'MIT',
      version: '3.0.0',
      status: 'approved' as const,
      downloadCount: 2560,
      viewCount: 7100,
      featured: true,
      screenshotUrl: 'https://picsum.photos/seed/searcheng/800/400',
      tags: '["search","elasticsearch","full-text"]',
    },
    {
      id: generateUUID(),
      slug: 'cdn-manager',
      name: 'CDN Manager',
      description:
        'Content delivery network controls with cache purging, URL signing, and geo-routing.',
      readme: '# CDN Manager\n\nDeliver content faster globally.',
      authorId: '2',
      authorName: 'customerservice',
      repositoryUrl: 'https://github.com/example/cdn-manager',
      license: 'MIT',
      version: '1.3.0',
      status: 'approved' as const,
      downloadCount: 870,
      viewCount: 2400,
      featured: false,
      screenshotUrl: 'https://picsum.photos/seed/cdn/800/400',
      tags: '["cdn","caching","delivery"]',
    },
    {
      id: generateUUID(),
      slug: 'logger-pro',
      name: 'Logger Pro',
      description:
        'Structured logging with severity levels, log rotation, and remote aggregation support.',
      readme: '# Logger Pro\n\nEnterprise logging made simple.',
      authorId: '1',
      authorName: 'superadmin',
      repositoryUrl: 'https://github.com/example/logger-pro',
      license: 'BSD-3-Clause',
      version: '2.1.0',
      status: 'approved' as const,
      downloadCount: 1190,
      viewCount: 3300,
      featured: false,
      screenshotUrl: 'https://picsum.photos/seed/logger/800/400',
      tags: '["logging","monitoring","structured"]',
    },
    {
      id: generateUUID(),
      slug: 'task-scheduler',
      name: 'Task Scheduler',
      description:
        'Cron job management with retry policies, concurrency controls, and execution history.',
      readme: '# Task Scheduler\n\nAutomate recurring tasks with confidence.',
      authorId: '3',
      authorName: 'user1',
      repositoryUrl: 'https://github.com/example/task-scheduler',
      homepageUrl: 'https://task-scheduler.example.com',
      license: 'MIT',
      version: '1.5.0',
      status: 'approved' as const,
      downloadCount: 1780,
      viewCount: 4900,
      featured: false,
      screenshotUrl: 'https://picsum.photos/seed/tasksched/800/400',
      tags: '["scheduler","cron","automation"]',
    },
    {
      id: generateUUID(),
      slug: 'ab-testing',
      name: 'A/B Testing',
      description:
        'Experiment framework with statistical significance calculation and variant allocation.',
      readme: '# A/B Testing\n\nData-driven decisions through controlled experiments.',
      authorId: '1',
      authorName: 'superadmin',
      repositoryUrl: 'https://github.com/example/ab-testing',
      license: 'Apache-2.0',
      version: '1.0.0',
      status: 'approved' as const,
      downloadCount: 640,
      viewCount: 2100,
      featured: false,
      screenshotUrl: 'https://picsum.photos/seed/abtest/800/400',
      tags: '["testing","experiment","analytics"]',
    },
    {
      id: generateUUID(),
      slug: 'markdown-editor',
      name: 'Markdown Editor',
      description:
        'Rich text editing with Markdown support, syntax highlighting, and live preview.',
      readme: '# Markdown Editor\n\nWrite beautifully with Markdown.',
      authorId: '2',
      authorName: 'customerservice',
      repositoryUrl: 'https://github.com/example/markdown-editor',
      homepageUrl: 'https://md-editor.example.com',
      license: 'MIT',
      version: '2.4.0',
      status: 'approved' as const,
      downloadCount: 2950,
      viewCount: 7400,
      featured: true,
      screenshotUrl: 'https://picsum.photos/seed/mdeditor/800/400',
      tags: '["markdown","editor","rich-text"]',
    },
    {
      id: generateUUID(),
      slug: 'webhook-manager',
      name: 'Webhook Manager',
      description:
        'Outgoing webhook automation with retry logic, payload templating, and delivery tracking.',
      readme: '# Webhook Manager\n\nReliable webhook delivery for your integrations.',
      authorId: '3',
      authorName: 'user1',
      repositoryUrl: 'https://github.com/example/webhook-manager',
      license: 'MIT',
      version: '1.2.0',
      status: 'pending' as const,
      downloadCount: 520,
      viewCount: 1800,
      featured: false,
      screenshotUrl: 'https://picsum.photos/seed/webhook/800/400',
      tags: '["webhook","automation","integration"]',
    },
    {
      id: generateUUID(),
      slug: 'two-factor-auth',
      name: 'Two-Factor Auth',
      description: '2FA/MFA support with TOTP, SMS OTP, and hardware key authentication methods.',
      readme: '# Two-Factor Auth\n\nAdd an extra layer of security.',
      authorId: '1',
      authorName: 'superadmin',
      repositoryUrl: 'https://github.com/example/two-factor-auth',
      license: 'MIT',
      version: '1.7.0',
      status: 'approved' as const,
      downloadCount: 2340,
      viewCount: 6100,
      featured: false,
      screenshotUrl: 'https://picsum.photos/seed/2fa/800/400',
      tags: '["2fa","security","authentication"]',
    },
    {
      id: generateUUID(),
      slug: 'database-browser',
      name: 'Database Browser',
      description:
        'GUI interface for browsing tables, running queries, and visualizing schema relationships.',
      readme: '# Database Browser\n\nExplore your data visually.',
      authorId: '2',
      authorName: 'customerservice',
      repositoryUrl: 'https://github.com/example/database-browser',
      license: 'GPL-3.0',
      version: '1.0.0',
      status: 'pending' as const,
      downloadCount: 340,
      viewCount: 1200,
      featured: false,
      screenshotUrl: 'https://picsum.photos/seed/dbbrowser/800/400',
      tags: '["database","gui","query"]',
    },
    {
      id: generateUUID(),
      slug: 'performance-monitor',
      name: 'Performance Monitor',
      description:
        'Core Web Vitals tracking with real user monitoring, alerts, and performance budgets.',
      readme: '# Performance Monitor\n\nKeep your app fast and responsive.',
      authorId: '1',
      authorName: 'superadmin',
      repositoryUrl: 'https://github.com/example/performance-monitor',
      homepageUrl: 'https://perf-monitor.example.com',
      license: 'MIT',
      version: '2.0.0',
      status: 'approved' as const,
      downloadCount: 1890,
      viewCount: 5300,
      featured: true,
      screenshotUrl: 'https://picsum.photos/seed/perfmon/800/400',
      tags: '["performance","monitoring","web-vitals"]',
    },
    {
      id: generateUUID(),
      slug: 'i18n-manager',
      name: 'i18n Manager',
      description:
        'Internationalization toolkit with translation memory, pluralization, and RTL support.',
      readme: '# i18n Manager\n\nGo global with multilingual support.',
      authorId: '3',
      authorName: 'user1',
      repositoryUrl: 'https://github.com/example/i18n-manager',
      license: 'MIT',
      version: '1.3.0',
      status: 'approved' as const,
      downloadCount: 1450,
      viewCount: 4100,
      featured: false,
      screenshotUrl: 'https://picsum.photos/seed/i18n/800/400',
      tags: '["i18n","translation","localization"]',
    },
  ]

  await db.insert(plugins).values(samplePlugins)

  const sampleVersions = [
    {
      id: generateUUID(),
      pluginId: samplePlugins[0].id,
      version: '2.1.0',
      changelog: 'Added responsive layout controls',
      status: 'approved' as const,
    },
    {
      id: generateUUID(),
      pluginId: samplePlugins[0].id,
      version: '2.0.0',
      changelog: 'Major rewrite with dark mode support',
      status: 'approved' as const,
    },
    {
      id: generateUUID(),
      pluginId: samplePlugins[1].id,
      version: '1.5.3',
      changelog: 'Fixed heatmap rendering',
      status: 'approved' as const,
    },
    {
      id: generateUUID(),
      pluginId: samplePlugins[1].id,
      version: '1.5.0',
      changelog: 'Added real-time tracking',
      status: 'approved' as const,
    },
    {
      id: generateUUID(),
      pluginId: samplePlugins[2].id,
      version: '1.2.0',
      changelog: 'Structured data support',
      status: 'approved' as const,
    },
    {
      id: generateUUID(),
      pluginId: samplePlugins[3].id,
      version: '3.0.1',
      changelog: 'Auto-documentation improvements',
      status: 'approved' as const,
    },
    {
      id: generateUUID(),
      pluginId: samplePlugins[3].id,
      version: '3.0.0',
      changelog: 'Major version with mock server',
      status: 'approved' as const,
    },
    {
      id: generateUUID(),
      pluginId: samplePlugins[4].id,
      version: '1.0.0',
      changelog: 'Initial release',
      status: 'pending' as const,
    },
  ]

  await db.insert(pluginVersions).values(sampleVersions)

  const sampleMappings = [
    { pluginId: samplePlugins[0].id, categoryId: sampleCategories[0].id },
    { pluginId: samplePlugins[1].id, categoryId: sampleCategories[1].id },
    { pluginId: samplePlugins[2].id, categoryId: sampleCategories[2].id },
    { pluginId: samplePlugins[3].id, categoryId: sampleCategories[3].id },
    { pluginId: samplePlugins[4].id, categoryId: sampleCategories[4].id },
  ]

  await db.insert(pluginCategoryMappings).values(sampleMappings)

  log.info({}, 'Plugin seeding complete!')
}

export async function initializeDatabase() {
  const db = await getDb()

  log.info({}, 'Initializing database...')

  const existingPermissions = await db.select().from(permissions)
  if (existingPermissions.length === 0) {
    log.info({}, 'Inserting initial permissions...')
    await db.insert(permissions).values(
      initialPermissions.map(p => ({
        ...p,
        description: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
    )
  }

  const existingRoles = await db.select().from(roles)
  if (existingRoles.length === 0) {
    log.info({}, 'Inserting initial roles...')
    await db.insert(roles).values(
      initialRoles.map(r => ({
        ...r,
        description: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
    )
  }

  const existingRolePermissions = await db.select().from(rolePermissions)
  if (existingRolePermissions.length === 0) {
    log.info({}, 'Inserting initial role permissions...')
    await db.insert(rolePermissions).values(
      initialRolePermissions.map(rp => ({
        ...rp,
        createdAt: new Date(),
      }))
    )
  }

  await seedDevelopersIfEmpty()

  log.info({}, 'Database initialization complete!')

  log.info({}, 'Seeding module data...')
  const moduleSeeders = [
    () => import('../module-todos/services/todo-service').then(m => m.seedTodosIfEmpty()),
    () => import('../module-order/services/order-service').then(m => m.seedOrdersIfEmpty()),
    () => import('../module-ticket/services/ticket-service').then(m => m.seedTicketsIfEmpty()),
    () => import('../module-dispute/services/dispute-service').then(m => m.seedDisputesIfEmpty()),
    () => import('../module-content/services/content-service').then(m => m.seedContentsIfEmpty()),
    () => import('../module-tenant/services/tenant-service').then(m => m.seedTenantsIfEmpty()),
    () => seedPluginsIfEmpty(),
  ]
  await Promise.all(moduleSeeders.map(fn => fn().catch(() => {})))
  log.info({}, 'Module data seeding complete!')
}

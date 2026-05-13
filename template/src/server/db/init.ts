import { getDb } from './driver'
import {
  permissions,
  roles,
  rolePermissions,
  plugins,
  pluginVersions,
  pluginCategories,
  pluginCategoryMappings,
} from './schema'
import { logger } from '../utils/logger'
import { seedOrdersIfEmpty } from '../module-order/services/order-service'
import { seedTicketsIfEmpty } from '../module-ticket/services/ticket-service'
import { seedDisputesIfEmpty } from '../module-dispute/services/dispute-service'
import { seedContentsIfEmpty } from '../module-content/services/content-service'
import { generateUUID } from '../utils/uuid'

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

async function seedPluginsIfEmpty() {
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

  log.info({}, 'Database initialization complete!')

  log.info({}, 'Seeding module data...')
  await Promise.all([
    seedOrdersIfEmpty(),
    seedTicketsIfEmpty(),
    seedDisputesIfEmpty(),
    seedContentsIfEmpty(),
    seedPluginsIfEmpty(),
  ])
  log.info({}, 'Module data seeding complete!')
}

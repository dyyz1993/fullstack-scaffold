/**
 * @framework-baseline rpc-surface-v1
 *
 * 按模块拆分的类型安全 RPC 门面（generator 管理文件）。
 *
 * 背景：此前客户端通过 `hc<ClientApiType>`（route-registry 里 11-13 个模块
 * 链式 merge 后的类型）调用 API，类型实例化深度随模块数线性增长，触发
 * TS2589，历史上甚至 patch 过 TypeScript 编译器（已被 no-ts-patch validator
 * 禁止）。
 *
 * 本文件是替代方案：每个模块单独实例化一个窄客户端（深度 = 1 个模块），
 * 组装成与旧 `apiClient.api.<segment>` 完全同形的门面对象。调用方
 * （client / admin / test-utils / CLI）全部通过 createApiFacade() 获取实例，
 * 运行时 URL 与旧实现一字不差（baseUrl + '/api' + 模块内部路径）。
 *
 * preset 裁剪时由 CLI generator 重新生成本文件（见 src/generators/rpc-surface.ts），
 * 只包含所选模块的导入与门面条目。
 */

import { hc } from 'hono/client'
import { mergeRpcObjects } from './rpc-merge'
import type { AuthApiType } from './module-auth/routes/auth-routes'
import type { ChatApiType } from './module-chat/routes/chat-routes'
import type { NotificationsApiType } from './module-notifications/routes/notification-routes'
import type { TodosApiType } from './module-todos/routes/todos-routes'
import type { PluginsApiType } from './module-plugin/routes/plugin-routes'
import type { PublicContentApiType } from './module-content/routes/public-content-routes'
import type { CommentsApiType } from './module-content/routes/comment-routes'
import type { CartApiType } from './module-order/routes/cart-routes'
import type { OrdersMockApiType } from './module-order/routes/orders-mock-routes'
import type { TopicsApiType } from './module-content/routes/topics-routes'
import type { MerchantApiType } from './module-merchant/routes/merchant-routes'
import type { OrdersApiType } from './module-order/routes/order-routes'
import type { TicketsApiType } from './module-ticket/routes/ticket-routes'
import type { DisputesApiType } from './module-dispute/routes/dispute-routes'
import type { ContentsApiType } from './module-content/routes/content-routes'
import type { CaptchaApiType } from './module-captcha/routes/captcha-routes'
import type { PermissionsApiType } from './module-permission/routes/permission-routes'
import type { RolesApiType } from './module-permission/routes/role-routes'
import type { AuditLogsApiType } from './module-permission/routes/audit-log-routes'
import type { AdminRoutesApiType } from './module-admin/routes/admin-routes'
import type { DashboardApiType } from './module-admin/routes/dashboard-routes'
import type { TenantApiType } from './module-tenant/routes/tenant-routes'
import type { PluginAdminApiType } from './module-plugin/routes/plugin-admin-routes'
import type { FilesApiType } from './module-file/routes/file-routes'

/** hono hc 的选项类型（fetch / webSocket / sse / headers 等） */
export type RpcClientOptions = NonNullable<Parameters<typeof hc>[1]>

/**
 * 创建按模块拆分的 RPC 门面。
 * 返回对象与旧 `hc<MergedApiType>(baseUrl)` 的调用形态完全兼容：
 * `facade.api.todos.$get()` 等价于旧的 `apiClient.api.todos.$get()`。
 */
export function createApiFacade(baseUrl: string, options: RpcClientOptions = {}) {
  const api = `${baseUrl.replace(/\/$/, '')}/api`

  const authClient = hc<AuthApiType>(api, options)
  const chatClient = hc<ChatApiType>(api, options)
  const notificationsClient = hc<NotificationsApiType>(api, options)
  const todosClient = hc<TodosApiType>(api, options)
  const pluginsClient = hc<PluginsApiType>(api, options)
  const publicContentClient = hc<PublicContentApiType>(api, options)
  const commentsClient = hc<CommentsApiType>(api, options)
  const cartClient = hc<CartApiType>(api, options)
  const ordersMockClient = hc<OrdersMockApiType>(api, options)
  const topicsClient = hc<TopicsApiType>(api, options)
  const merchantClient = hc<MerchantApiType>(api, options)
  const ordersClient = hc<OrdersApiType>(api, options)
  const ticketsClient = hc<TicketsApiType>(api, options)
  const disputesClient = hc<DisputesApiType>(api, options)
  const contentsClient = hc<ContentsApiType>(api, options)
  const captchaClient = hc<CaptchaApiType>(api, options)
  const permissionsClient = hc<PermissionsApiType>(api, options)
  const rolesClient = hc<RolesApiType>(api, options)
  const auditLogsClient = hc<AuditLogsApiType>(api, options)
  const adminRoutesClient = hc<AdminRoutesApiType>(api, options)
  const dashboardClient = hc<DashboardApiType>(api, options)
  const tenantClient = hc<TenantApiType>(api, options)
  const pluginAdminClient = hc<PluginAdminApiType>(api, options)
  const filesClient = hc<FilesApiType>(api, options)

  return {
    api: {
      auth: authClient.auth,
      chat: chatClient.chat,
      notifications: notificationsClient.notifications,
      todos: todosClient.todos,
      plugins: mergeRpcObjects(pluginsClient.plugins, pluginAdminClient.plugins),
      categories: mergeRpcObjects(pluginsClient.categories, pluginAdminClient.categories),
      stats: mergeRpcObjects(pluginsClient.stats, pluginAdminClient.stats),
      public: mergeRpcObjects(publicContentClient.public, filesClient.public),
      'generate-url': filesClient['generate-url'],
      upload: filesClient['upload'],
      private: filesClient['private'],
      cart: cartClient.cart,
      'orders-mock': ordersMockClient['orders-mock'],
      profile: topicsClient.profile,
      topics: topicsClient.topics,
      merchant: merchantClient.merchant,
      orders: ordersClient.orders,
      tickets: ticketsClient.tickets,
      disputes: disputesClient.disputes,
      // 'contents' 段由 comment-routes（client）与 content-routes（admin）共同提供，
      // 用运行时合并避免类型层 merge
      contents: mergeRpcObjects(commentsClient.contents, contentsClient.contents),
      captcha: captchaClient.captcha,
      'verify-captcha': captchaClient['verify-captcha'],
      permissions: permissionsClient.permissions,
      roles: rolesClient.roles,
      'audit-logs': auditLogsClient['audit-logs'],
      // 'admin' 段由 dashboard-routes 与 admin-routes（内部再嵌 6 个子路由）共同提供，
      // 用运行时合并避免类型层 merge
      admin: mergeRpcObjects(dashboardClient.admin, adminRoutesClient.admin),
      tenants: tenantClient.tenants,
      tenant: tenantClient.tenant,
    },
  }
}

export type ApiFacade = ReturnType<typeof createApiFacade>

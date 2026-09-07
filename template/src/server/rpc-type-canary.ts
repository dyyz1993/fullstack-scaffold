/**
 * @framework-baseline 779069c2d2bb618c
 */

/**
 * TS2589 哨兵（编译期早期预警）
 *
 * 历史：route-registry 曾把 N 个模块链式 merge 成巨型类型导出，hc<T> 实例化时
 * 深度展开整条链触发 TS2589（Type instantiation is excessively deep），
 * 甚至一度 patch 了 TypeScript 编译器（已被 no-ts-patch validator 禁止）。
 * 现行架构：每个模块导出窄类型（深度 = 1），rpc-surface 按模块实例化。
 *
 * 本文件的职责：对每个模块的窄类型做一次真实的 hc 值级实例化。
 * 若将来有人把某个模块类型重新指到 merge 链上（例如让 XxxApiType 依赖
 * route-registry 的合并结果），深度爆炸会先在这里报错——错误落在哨兵文件、
 * 语义明确，而不是散落在业务代码里让推导"莫名其妙地失败"。
 *
 * 配套防线：
 * - eslint 规则 no-merged-api-type-export（禁止导出 merge 类型，形态级拦截）
 * - no-ts-patch validator（禁止放宽编译器保险丝）
 * - CI template-checks 的 tsc 耗时预算（拦截"不报错但变慢"的慢性回退）
 */

import { hc } from 'hono/client'
import type { AuthApiType } from './module-auth/routes/auth-routes'
import type { ProfileApiType } from './module-auth/routes/profile-routes'
import type { ChatApiType } from './module-chat/routes/chat-routes'
import type { NotificationsApiType } from './module-notifications/routes/notification-routes'
import type { TodosApiType } from './module-todos/routes/todos-routes'
import type { PluginsApiType } from './module-plugin/routes/plugin-routes'
import type { PluginAdminApiType } from './module-plugin/routes/plugin-admin-routes'
import type { PublicContentApiType } from './module-content/routes/public-content-routes'
import type { ContentsApiType } from './module-content/routes/content-routes'
import type { TopicsApiType } from './module-content/routes/topics-routes'
import type { CartApiType } from './module-order/routes/cart-routes'
import type { OrdersApiType } from './module-order/routes/order-routes'
import type { OrdersMockApiType } from './module-order/routes/orders-mock-routes'
import type { MerchantApiType } from './module-merchant/routes/merchant-routes'
import type { TicketsApiType } from './module-ticket/routes/ticket-routes'
import type { DisputesApiType } from './module-dispute/routes/dispute-routes'
import type { CaptchaApiType } from './module-captcha/routes/captcha-routes'
import type { PermissionsApiType } from './module-permission/routes/permission-routes'
import type { RolesApiType } from './module-permission/routes/role-routes'
import type { AuditLogsApiType } from './module-permission/routes/audit-log-routes'
import type { AdminRoutesApiType } from './module-admin/routes/admin-routes'
import type { DashboardApiType } from './module-admin/routes/dashboard-routes'
import type { TenantApiType } from './module-tenant/routes/tenant-routes'
import type { FilesApiType } from './module-file/routes/file-routes'
import { createApiFacade } from './rpc-surface'

const api = '/api-canary'

// 每个模块一次值级实例化：深度爆炸在此处定点报错（TS2589）
export const canaryAuth = hc<AuthApiType>(api)
export const canaryProfile = hc<ProfileApiType>(api)
export const canaryChat = hc<ChatApiType>(api)
export const canaryNotifications = hc<NotificationsApiType>(api)
export const canaryTodos = hc<TodosApiType>(api)
export const canaryPlugins = hc<PluginsApiType>(api)
export const canaryPluginAdmin = hc<PluginAdminApiType>(api)
export const canaryPublicContent = hc<PublicContentApiType>(api)
export const canaryContents = hc<ContentsApiType>(api)
export const canaryTopics = hc<TopicsApiType>(api)
export const canaryCart = hc<CartApiType>(api)
export const canaryOrders = hc<OrdersApiType>(api)
export const canaryOrdersMock = hc<OrdersMockApiType>(api)
export const canaryMerchant = hc<MerchantApiType>(api)
export const canaryTickets = hc<TicketsApiType>(api)
export const canaryDisputes = hc<DisputesApiType>(api)
export const canaryCaptcha = hc<CaptchaApiType>(api)
export const canaryPermissions = hc<PermissionsApiType>(api)
export const canaryRoles = hc<RolesApiType>(api)
export const canaryAuditLogs = hc<AuditLogsApiType>(api)
export const canaryAdminRoutes = hc<AdminRoutesApiType>(api)
export const canaryDashboard = hc<DashboardApiType>(api)
export const canaryTenant = hc<TenantApiType>(api)
export const canaryFiles = hc<FilesApiType>(api)

// 门面整体形状哨兵：所有段必须在门面上可访问
export const canaryFacade = createApiFacade('/api-canary')

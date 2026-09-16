/**
 * Admin routes available in the current build.
 *
 * 模板仓库内为全量版本（fullstack-admin 超集）。脚手架生成时会按 preset
 * 的模块清单重新生成本文件（src/generators/admin-app.ts 的
 * generateAdminSidebarRoutes）：未包含的模块（如 forum preset 无 plugin）
 * 对应路由不会出现在列表里，Sidebar 据此隐藏菜单入口，
 * 避免点击后渲染空白内容区（P2：forum /admin/categories 实测缺陷）。
 *
 * 路径为 admin SPA 内部路径（basename /admin 相对路径），与 Sidebar 的
 * NavLink to 一致；manifest 中带 /admin 前缀的路由已归一化。
 * 注：文件名避开 *routes*（该模式被目录结构校验强制归入 routes/）。
 */
export const AVAILABLE_ADMIN_ROUTES: readonly string[] = [
  '/login',
  '/register',
  '/dashboard',
  '/users',
  '/system/settings',
  '/test/media',
  '/content',
  '/orders',
  '/tickets',
  '/disputes',
  '/system/permissions',
  '/system/roles',
  '/system/logs',
  '/plugins',
  '/plugins/review',
  '/plugins/dashboard',
  '/categories',
]

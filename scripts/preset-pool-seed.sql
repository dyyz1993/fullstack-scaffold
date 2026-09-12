-- preset-pool-db 演示种子（幂等，可重复执行）
-- ============ RBAC 最小集 ============
INSERT OR IGNORE INTO roles (id, code, name, label, description, is_system, is_active, sort_order, created_at, updated_at) VALUES
  ('role_super_admin', 'super_admin', 'super_admin', '超级管理员', '平台全部权限', 1, 1, 0, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('role_customer_service', 'customer_service', 'customer_service', '客服', '客服权限', 1, 1, 1, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('role_user', 'user', 'user', '普通用户', '基础权限', 1, 1, 2, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'));

INSERT OR IGNORE INTO permissions (id, code, name, label, category, sort_order, is_active, created_at, updated_at) VALUES
  ('perm_system_manage', 'system:manage', '系统管理', '系统管理', 'system', 0, 1, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('perm_todos_view', 'todos:view', '查看待办', '查看待办', 'todos', 1, 1, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('perm_todos_edit', 'todos:edit', '编辑待办', '编辑待办', 'todos', 2, 1, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('perm_content_view', 'content:view', '查看内容', '查看内容', 'content', 3, 1, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('perm_content_edit', 'content:edit', '编辑内容', '编辑内容', 'content', 4, 1, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('perm_order_view', 'order:view', '查看订单', '查看订单', 'order', 5, 1, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('perm_plugin_view', 'plugin:view', '查看插件', '查看插件', 'plugin', 6, 1, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'));

INSERT OR IGNORE INTO role_permissions (role_id, permission_id, created_at) VALUES
  ('role_super_admin', 'perm_system_manage', strftime('%s','now')),
  ('role_super_admin', 'perm_todos_view', strftime('%s','now')),
  ('role_super_admin', 'perm_todos_edit', strftime('%s','now')),
  ('role_super_admin', 'perm_content_view', strftime('%s','now')),
  ('role_super_admin', 'perm_content_edit', strftime('%s','now')),
  ('role_super_admin', 'perm_order_view', strftime('%s','now')),
  ('role_super_admin', 'perm_plugin_view', strftime('%s','now')),
  ('role_customer_service', 'perm_todos_view', strftime('%s','now')),
  ('role_customer_service', 'perm_content_view', strftime('%s','now')),
  ('role_user', 'perm_todos_view', strftime('%s','now')),
  ('role_user', 'perm_content_view', strftime('%s','now'));

INSERT OR IGNORE INTO user_roles (id, user_id, role_id, is_active, assigned_at) VALUES
  ('ur_super_admin_1', 'super-admin-1', 'role_super_admin', 1, strftime('%s','now')),
  ('ur_demo_dev', 'demo-dev-1', 'role_user', 1, strftime('%s','now'));

-- ============ 认证账号（developers，saas/各 preset 登录用） ============
INSERT OR IGNORE INTO developers (id, username, email, password_hash, role, api_key, created_at, updated_at) VALUES
  ('super-admin-1', 'superadmin', 'admin@biomimic.app', '$2b$10$rBubML.7HPR7S/AxRXW2B.BENa9zeFwTF/HjCNaIWEfhE7Q1i9Lc2', 'super_admin', lower(hex(randomblob(16))), strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('demo-dev-1', 'demo', 'demo@biomimic.app', '$2b$10$5zYFUDdZJa4s9DNFP52/COij7BGwuLoMrTCRjfA8h9xOS7El7xsUu', 'developer', lower(hex(randomblob(16))), strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'));

-- ============ 租户（saas 演示） ============
INSERT OR IGNORE INTO tenants (name, slug, status, plan, max_users, settings, created_at, updated_at) VALUES
  ('Demo Corp', 'demo', 'active', 'pro', 50, '{"theme":"dark"}', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('Acme Inc', 'acme', 'trial', 'starter', 10, NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'));

INSERT OR IGNORE INTO tenant_roles (id, tenant_id, code, name, label, permissions, is_system, is_active, sort_order, created_at, updated_at) VALUES
  ('tr_demo_admin', (SELECT id FROM tenants WHERE slug='demo'), 'tenant_admin', 'tenant_admin', '租户管理员', '["tenant:member:view","tenant:member:invite","tenant:member:remove","tenant:member:role:assign","tenant:role:view","tenant:role:create","tenant:role:edit","tenant:role:delete","tenant:settings:view","tenant:settings:edit","tenant:data:view","tenant:data:create","tenant:data:edit","tenant:data:delete","tenant:data:export","tenant:billing:view","tenant:audit:view"]', 1, 1, 0, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('tr_demo_member', (SELECT id FROM tenants WHERE slug='demo'), 'tenant_member', 'tenant_member', '普通成员', '["tenant:member:view","tenant:role:view","tenant:settings:view","tenant:data:view","tenant:data:create","tenant:data:edit","tenant:data:delete","tenant:data:export"]', 1, 1, 1, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('tr_demo_guest', (SELECT id FROM tenants WHERE slug='demo'), 'tenant_guest', 'tenant_guest', '访客', '["tenant:member:view","tenant:role:view","tenant:settings:view","tenant:data:view"]', 1, 1, 2, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('tr_acme_admin', (SELECT id FROM tenants WHERE slug='acme'), 'tenant_admin', 'tenant_admin', '租户管理员', '["tenant:member:view","tenant:member:invite","tenant:member:remove","tenant:role:view","tenant:settings:view","tenant:settings:edit","tenant:data:view","tenant:data:create","tenant:data:edit","tenant:data:delete"]', 1, 1, 0, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'));

INSERT OR IGNORE INTO tenant_members (id, tenant_id, user_id, role_id, status, joined_at, last_active_at) VALUES
  ('tm_demo_owner', (SELECT id FROM tenants WHERE slug='demo'), 'superadmin', 'tr_demo_admin', 'active', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('tm_acme_owner', (SELECT id FROM tenants WHERE slug='acme'), 'demo', 'tr_acme_admin', 'active', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'));

-- ============ Todos 演示数据（归 demo 租户） ============
INSERT OR IGNORE INTO todos (tenant_id, title, description, status, created_at, updated_at) VALUES
  ((SELECT id FROM tenants WHERE slug='demo'), '学习 Hono RPC', '构建类型安全的 API 调用', 'completed', strftime('%s','now')*1000 - 86400000*5, strftime('%s','now')*1000),
  ((SELECT id FROM tenants WHERE slug='demo'), '部署到 Cloudflare', 'Serverless 部署方案', 'pending', strftime('%s','now')*1000 - 86400000*4, strftime('%s','now')*1000),
  ((SELECT id FROM tenants WHERE slug='demo'), '优化前端性能', '减少不必要的渲染', 'in_progress', strftime('%s','now')*1000 - 86400000*3, strftime('%s','now')*1000),
  ((SELECT id FROM tenants WHERE slug='demo'), '探索 WebSocket 聊天', '双向实时通信', 'pending', strftime('%s','now')*1000 - 86400000*2, strftime('%s','now')*1000),
  ((SELECT id FROM tenants WHERE slug='demo'), '编写集成测试', 'Vitest 覆盖核心链路', 'completed', strftime('%s','now')*1000 - 86400000, strftime('%s','now')*1000);

-- ============ Contents（forum/content 演示） ============
INSERT OR IGNORE INTO contents (id, title, content, category, author, status, views, created_at, updated_at) VALUES
  ('content-welcome', '欢迎使用全栈脚手架', '这是一篇演示内容，展示内容模块的发布与展示能力。', 'article', 'superadmin', 'published', 128, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('content-isr', 'ISR 增量静态再生示例', '内容页支持 SEO 友好的服务端渲染与按需再生。', 'tutorial', 'superadmin', 'published', 356, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'));

-- ============ 插件市场最小集（xbrowser-marketplace/shop 演示） ============
INSERT OR IGNORE INTO plugin_categories (id, name, slug, description, sort_order, created_at) VALUES
  ('pcat-tools', '工具', 'tools', '效率与开发工具', 0, strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('pcat-ai', 'AI', 'ai', 'AI 能力扩展', 1, strftime('%Y-%m-%dT%H:%M:%fZ','now'));

INSERT OR IGNORE INTO plugins (id, slug, name, description, category_id, status, downloads, rating, author, created_at, updated_at) VALUES
  ('plugin-auth-guard', 'auth-guard', 'Auth Guard', '认证与权限防护插件', 'pcat-tools', 'approved', 1520, 4.8, 'official', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('plugin-ai-helper', 'ai-helper', 'AI Helper', '内置 AI 助手能力', 'pcat-ai', 'approved', 2301, 4.9, 'official', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'));

-- ============ 通知（notifications 演示） ============
INSERT OR IGNORE INTO notifications (id, type, title, message, read, created_at) VALUES
  ('notif-demo-1', 'info', '欢迎使用演示站', '本站为 create-fullstack-scaffold 的在线演示。', 0, strftime('%s','now')*1000),
  ('notif-demo-2', 'success', '多租户能力已上线', '租户开通、邀请、配额、隔离全链路可用。', 0, strftime('%s','now')*1000);

-- ============ 七子域租户（saas 隔离中间件按子域 slug 查租户，缺则 404） ============
INSERT OR IGNORE INTO tenants (name, slug, status, plan, max_users, settings, created_at, updated_at) VALUES
  ('Saas Demo', 'saas', 'active', 'pro', 50, NULL, 1789000000000, 1789000000000),
  ('Fullstack Demo', 'fullstack', 'active', 'pro', 50, NULL, 1789000000000, 1789000000000),
  ('Todo Demo', 'todo', 'active', 'pro', 50, NULL, 1789000000000, 1789000000000),
  ('Shop Demo', 'shop', 'active', 'pro', 50, NULL, 1789000000000, 1789000000000),
  ('Forum Demo', 'forum', 'active', 'pro', 50, NULL, 1789000000000, 1789000000000),
  ('Market Demo', 'market', 'active', 'pro', 50, NULL, 1789000000000, 1789000000000),
  ('Minimal Demo', 'minimal', 'active', 'pro', 50, NULL, 1789000000000, 1789000000000);

-- 注意：凡 schema 声明 integer mode:'timestamp' 的列必须存 unixepoch 毫秒数——
-- 存 ISO 字符串会导致 Workers 端 toISOString 抛 Invalid time value（0.6.6 部署实测）

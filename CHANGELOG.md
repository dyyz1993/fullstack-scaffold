# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.7.0] - 2026-09-14

### Added

- **market 插件市场全生命周期**：插件审核/下架/上架/推荐/删除管理 UI（4 页接线）、我的安装页（安装记录表 + 列表/卸载/幂等重装）、14 个管理路由补 SUPER_ADMIN 鉴权
- **forum 社区能力**：内容评论区（发表/删除/分页，作者与超管权限分离）、Topics 分类聚合视图（标签云过滤）、Popular 热度排行（排名徽章 + 热度条）
- **shop 电商闭环**：详情页加购（购买条 + 本地购物车持久化）、Checkout 生成真实订单（ORD-2026 格式）、订单页真实数据替代 mock
- **saas 平台管理**：平台租户列表页、审计日志页（此前 API 存在但无 UI）；RBAC UI 收敛（普通成员不再显示管理按钮）；租户级统计口径统一；欢迎语账号化
- **移动端登录入口**：MobileAuthBar（所有含 client 的 preset，md 以下显示登录/登出）
- **门户测试矩阵页**（presets.lpm1.top/#playbook）：344 条操作链路、19 身份、8 形态，正/逆向徽章 + 步骤 + 预期 + 实拍截图，safe-embed 与 XSS 转义
- **Test Playbook 翻倍**：64 → 344 案例，19 身份全部正逆向双向覆盖（193 正 / 151 逆），含边界输入、IDOR、伪造 token、身份交叉矩阵
- CLI 命名空间化：16 个模块命令改为 `todos list` 风格命名空间注册 + 注册冲突守卫（修复同名命令互相覆盖）
- GET /api/auth/me 端点（当前用户 profile）
- 客户端全局 ErrorBoundary + parseApiError 统一错误解析（5 种 400 形状）+ 表单长度上限校验

### Changed

- 全部 schema 时间戳默认值统一为秒语义（85 处，消除 drizzle 内联毫秒默认与 mode:'timestamp' 的 58670 年隐患）
- admin 仪表盘时间本地化格式（替代裸 ISO）、验证码测试页阈值对齐真实限流 20 次
- 登录页预填凭据统一为共享池真实 demo 用户

### Fixed

- SSR /todos 跨租户暴露（双场景收口：已认证请求与匿名缓存均不嵌入租户数据）
- 登录成功跳转硬编码 /todos 致 forum/market 404；登录页假报 Invalid credentials（persist 未做 partialize）
- plugin 写路由缺失 authMiddleware 致评论提交 500（假 404 掩盖）
- 权限双源不一致（登录 45 项 vs init 7 项 → 超管恒回全量）
- 未知角色越权放行（roleHierarchy undefined 比较 → 按最低权限）
- node 入口 onError 只认 status 不认 statusCode 致 401 降级 500
- 验证码拦截器死循环（captcha/verify 端点被自身弹窗队列吞掉）
- 输入超长/短密码整页白屏（ErrorBoundary + 前端校验兜底）
- shop 双击 Checkout 重复下单；导航双高亮；404 页无返回 CTA
- /api/profile 免鉴权返回模拟身份；forum /profile 游客显示 Jane Doe 假档案
- 生成器缺口：user-event 依赖白名单、EMAIL_MAX_LENGTH 导出、orderStore 按页面裁剪

## [0.1.0] - 2026-05-09

### Added

- Multi-template architecture with 3 presets (fullstack-admin, todo-app, minimal)
- Module manifest system (module.ts) for all 11 modules
- `--preset` flag and `presets` command for CLI
- Interactive preset selection when no flag provided
- 15+ code generators for per-preset file generation
- Per-preset dependency filtering
- Module validation script (`npm run validate:modules`)
- `template-modules` CI job for manifest validation
- Per-preset build verification in CI matrix

### Changed

- Package renamed from `create-biomimic-app` to `create-fullstack-scaffold`
- CLI banner now includes Hono
- Module generators are manifest-driven (no parallel hardcoded lists)
- server-app.ts and db-init.ts generators build from scratch (no regex replacement)
- Manifest parser uses tsx dynamic import instead of regex

### Removed

- Unused dependencies (lodash-es, chalk, mysql2) from template
- 250+ lines of fragile regex parsing code

### Fixed

- vite.config.ts generation for non-admin presets (build failure)
- CI working directory for validate:modules step

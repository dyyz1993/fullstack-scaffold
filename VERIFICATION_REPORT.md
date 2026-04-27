# 15 场景完整验证报告

> 生成日期：2026-04-27
> 验证方式：每个场景 4 阶段（生成+静态检查 → 安装+启动 → 业务功能开发 → git commit）

## 总览

| #   | 场景              | 配置摘要                                | P1 静态 | P2 启动 | P3 业务 | P4 建议               |
| --- | ----------------- | --------------------------------------- | ------- | ------- | ------- | --------------------- |
| S1  | 纯前端 SPA        | web only, no backend                    | ✅      | ✅      | ✅      | 后端文件残留          |
| S2  | 纯前端 MySQL      | web only, mysql, no backend             | ✅      | ✅      | ✅      | 同 S1                 |
| S3  | 纯前端 CF Pages   | web only, cloudflare, no backend        | ✅      | ✅      | ✅      | wrangler 简化         |
| S4  | Headless API      | no channels, todos                      | ✅      | ✅      | N/A     | SPA 回退冗余          |
| S5  | 最小全栈 Web      | web+backend, todos, sqlite              | ✅      | ✅      | ✅      | 无重大问题            |
| S6  | Web + MySQL       | web+backend, todos, mysql               | ✅      | ✅\*    | N/A     | drizzle config 未适配 |
| S7  | CF 全栈基础       | web+backend, todos, cloudflare, d1      | ✅      | ✅      | ✅      | D1 需手动配置         |
| S8  | CF + chat + notif | web+backend, chat+notifications, cf, d1 | ✅      | ✅      | ✅      | S2 warning 非阻塞     |
| S9  | CF + Agent        | web+backend, agent+file, cf, d1         | ✅      | ⚠️      | N/A     | agent 在 CF 受限(S4)  |
| S10 | Web + Ops         | web+ops, todos+permission+ops           | ✅      | ✅      | ✅      | 无重大问题            |
| S11 | 全通道运营平台    | 5通道+6模块+mysql                       | ✅      | ✅      | ✅      | 高复杂度注意          |
| S12 | Web + Mobile      | web+mobile, todos+chat+notif            | ✅      | ✅      | N/A     | 无重大问题            |
| S13 | Mobile + MiniApp  | mobile+miniapp, 4模块+mysql             | ✅      | ✅      | ✅      | 纯 API 正常           |
| S14 | 电商全模块        | 3通道+10模块+mysql                      | ✅      | ✅      | ✅      | 构建性能              |
| S15 | AI Agent 平台     | web+cli, chat+agent+file+notif+captcha  | ✅      | ✅      | ✅      | 安全考虑              |

\* S6 跳过实际启动（需 MySQL 服务器），基于 S5 模式推断

## 发现并修复的 Bug（共 15 个）

### 核心架构 Bug

| #   | Bug                                    | 位置                               | 修复                               |
| --- | -------------------------------------- | ---------------------------------- | ---------------------------------- |
| 1   | 空 RouteKey 类型（所有模块被移除时）   | generator.ts cleanClientNavigation | 设为 `never`，清空 routes          |
| 2   | 纯前端项目残留 websocketPlugin         | generator.ts updateViteConfig      | 移除 plugin 调用和 vite-plugins.ts |
| 3   | wrangler.toml/package.json name 含路径 | generator.ts updatePackageJson     | 使用 path.basename()               |
| 4   | sharedSchemasIndex 遗漏 export 行      | module-registry.ts:82              | 添加第 37 行到索引                 |
| 5   | Navigation 清理遗漏 Plug icon          | generator.ts:440                   | 添加到 iconMap                     |

### 部署/通道 Bug

| #   | Bug                             | 位置                                | 修复                          |
| --- | ------------------------------- | ----------------------------------- | ----------------------------- |
| 6   | 无通道项目 SPA 回退冗余         | generator.ts deleteFrontendChannels | 移除 index.html/ops.html 引用 |
| 7   | 无通道项目 Vite 别名冗余        | generator.ts updateViteConfig       | 移除 @client/@ops 别名        |
| 8   | DurableObjectNamespace 未清理   | generator.ts:896-903                | 先匹配多行块再替换类型名      |
| 9   | 纯前端 CF wrangler 未简化       | generator.ts updateWranglerToml     | 生成 Pages 专用 wrangler      |
| 10  | 纯前端 tsup/cloudflare 配置残留 | generator.ts updateTsupConfig       | backend:false 时移除          |

### 模块依赖 Bug

| #   | Bug                                | 位置                              | 修复                           |
| --- | ---------------------------------- | --------------------------------- | ------------------------------ |
| 11  | Tenant-without-permission 存根缺失 | generator.ts:1424-1507            | 自动生成 tenant-permissions.ts |
| 12  | Auth middleware passthrough 缺类型 | generator.ts:1064-1073            | 声明 ContextVariableMap        |
| 13  | Captcha 路由丢失（无 ops 时）      | generator.ts:178-207              | 迁移到 clientApiRoutes         |
| 14  | 纯前端项目残留 drizzle.config      | generator.ts updateConfigFiles    | backend:false 时删除           |
| 15  | 纯前端项目残留 apiClient.ts        | generator.ts cleanClientCrossRefs | backend:false 时删除           |

## 第二轮修复（全部完成）

### 已修复

| #   | 问题                                 | 修复                                                                        |
| --- | ------------------------------------ | --------------------------------------------------------------------------- |
| 16  | MySQL drizzle.config 未适配          | `updateDrizzleConfig`：mysql→mysql dialect + 连接凭据，d1→d1-http driver    |
| 17  | MySQL db/driver.ts 只有 libsql       | `updateDbDriver`：mysql 时生成 mysql2 driver                                |
| 18  | MySQL docker-compose 无 mysql 服务   | `updateDockerCompose`：mysql 时生成 mysql:8.0 服务配置                      |
| 19  | MySQL schema 用 sqlite 列类型        | `updateDbSchemaForMysql`：sqliteTable→mysqlTable, integer→int, text→varchar |
| 20  | MySQL .returning() 不兼容            | 替换 insert/update/delete 中的 .returning() 为 select 查询                  |
| 21  | 纯前端残留 docker-compose/Dockerfile | backend:false 时删除 + .env.example 清理数据库段落                          |
| 22  | Agent+CF warning 文案不清晰          | 明确说明 sandbox 降级 + 建议 Node.js                                        |
| 23  | 无模块默认路由指向 /todos            | 生成 HomePage 组件 + 默认路由改为 HomePage                                  |
| 24  | D1 drizzle.config.ts out 属性重复    | 删除重复行                                                                  |

### 第二轮验证（5 个关键场景重跑）

| 场景         | 验证点                                             | 结果 |
| ------------ | -------------------------------------------------- | ---- |
| V1 纯前端    | docker-compose/Dockerfile/drizzle 全清理           | ✅   |
| V2 MySQL     | drizzle mysql dialect + driver + docker mysql 服务 | ✅   |
| V3 纯前端 CF | wrangler Pages 专用 + 无后端文件                   | ✅   |
| V4 无模块    | HomePage 默认路由                                  | ✅   |
| V5 CF+Agent  | S4 warning 文案含 sandbox 降级说明                 | ✅   |

## 剩余建议（低优先级）

1. **无 permission 时的安全加固**：建议为敏感 API 添加基本认证
2. **10+ 模块项目构建性能**：模块路由懒加载、重依赖 CDN 化
3. **TS5101 弃用警告**：模板 tsconfig.json 的 `baseUrl` 在 TS 7.0 将弃用
4. **Headless 项目的空 rollupOptions**：无 HTML 入口点时 build 应跳过

## CLI 源码最终状态

```
TSC:    ✅ 0 errors
ESLint: ✅ 0 errors, 0 warnings
Tests:  ✅ 22/22 passed (17 unit + 5 integration)
```

## 关键修改文件

| 文件                        | 改动                                             |
| --------------------------- | ------------------------------------------------ |
| `src/commands/generator.ts` | 24 个 bug 修复 + MySQL/CF/纯前端适配             |
| `src/module-registry.ts`    | 修正 sharedSchemasIndex 索引                     |
| `src/types.ts`              | ProjectConfig + validateConfig + S4 warning 改进 |
| `src/index.ts`              | 集成交互式流程                                   |
| `src/commands/prompts.ts`   | 5 步交互式配置                                   |
| `src/utils.ts`              | 工具函数迁移                                     |
| `src/utils.test.ts`         | 17 个单元测试                                    |
| `src/integration.test.ts`   | 5 个集成测试（新增）                             |
| `package.json`              | description + test script                        |
| `README.md`                 | 操作指南 + 15 场景对照表                         |

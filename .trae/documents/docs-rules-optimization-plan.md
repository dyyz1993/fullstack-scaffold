# 文档和规则优化计划

## 背景
在完成 `admin → ops` 重命名后，项目中有大量文档和规则文件仍然引用旧的 `admin` 命名，需要统一更新为 `ops`。

## 需要更新的文件清单

### 1. 规则文件（高优先级）

| 文件 | 需要更新的内容 |
|------|----------------|
| `.trae/rules/40-admin-module.md` | 路径 `src/admin/**` → `src/ops/**`，内容中所有 admin 引用 |
| `.trae/rules/34-client-admin-module.md` | 同上 |
| `.claude/rules/40-admin-module.md` | 同上（如果存在） |
| `.claude/rules/34-client-admin-module.md` | 同上（如果存在） |

### 2. 文档文件（中优先级）

| 文件 | 需要更新的内容 |
|------|----------------|
| `.trae/documents/admin_permission_enhancement_plan.md` | 文件名和内容中的 admin 引用 |
| `docs/PERMISSION_ARCHITECTURE.md` | admin 相关引用 |
| `docs/PERMISSION_SYSTEM.md` | admin 相关引用 |
| `docs/PERMISSION_EXAMPLES.md` | admin 相关引用 |
| `FRAMEWORK_HISTORY.md` | admin 相关引用 |

### 3. 配置文件（中优先级）

| 文件 | 需要更新的内容 |
|------|----------------|
| `lint-scripts/config/project.config.ts` | admin 相关配置 |
| `eslint-rules/no-middleware-in-routes.js` | 注释中的 admin 引用 |
| `eslint-rules/README-no-middleware-in-routes.md` | admin 相关引用 |

### 4. 测试文件（低优先级）

测试文件中的 `admin` 引用通常是 API 路径（如 `apiClient.api.admin.*`），这些是后端路由名称，**不需要修改**。

### 5. 代码注释（低优先级）

代码文件中的注释如果包含 `admin`，需要根据上下文判断是否需要更新。

## 更新规则

### 需要更新的情况
- 目录路径引用：`src/admin/` → `src/ops/`
- 模块名称：`module-admin` → `module-ops`
- 路由名称：`adminRoutes` → `opsRoutes`
- 变量/类型名称：`AdminApi` → `OpsApi`
- 文档标题和描述中的 "Admin" 或 "管理后台" → "Ops" 或 "运营后台"

### 不需要更新的情况
- API 路径：`apiClient.api.admin.*`（后端路由名称保持不变）
- 数据库字段名
- 外部依赖名称
- 历史记录/变更日志中的引用

## 实施步骤

### Step 1: 更新规则文件
1. 重命名规则文件：`40-admin-module.md` → `40-ops-module.md`
2. 更新文件内容中的所有 admin 引用
3. 更新 `paths` 配置

### Step 2: 更新文档文件
1. 重命名 `admin_permission_enhancement_plan.md` → `ops_permission_enhancement_plan.md`
2. 更新文档内容中的 admin 引用
3. 检查并更新相关文档的交叉引用

### Step 3: 更新配置文件
1. 更新 `project.config.ts` 中的路径配置
2. 更新 ESLint 规则文件中的注释

### Step 4: 验证
1. 运行类型检查确保无错误
2. 运行测试确保无失败
3. 检查文档链接是否有效

## 预期结果

- 所有规则文件路径和内容统一使用 `ops` 命名
- 所有文档统一使用 "运营后台" 或 "Ops" 术语
- 代码注释保持一致性
- 测试和构建正常通过

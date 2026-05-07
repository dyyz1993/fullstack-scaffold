# Claude Code Hooks 和 Git Hooks 自动校验实施计划

## 📋 目标概述

实现一个自动化的代码检查和校验系统，在以下场景触发：
1. **Claude Code 每次修改后**：自动运行检查
2. **Git commit 前**：通过 husky pre-commit hook 运行检查
3. **主要检查内容**：
   - 服务端 RPC 用法：必须使用链式语法
   - 客户端 RPC 调用：必须使用 apiClient 并有类型推导
   - 目录结构摆放：确保文件放在正确位置

## 🏗️ 架构设计

### 现有基础设施
- ✅ `lint-scripts/` 目录已存在
- ✅ 已有 3 个验证器：TODO、敏感信息、导入路径
- ✅ 已有 husky 和 lint-staged 配置
- ✅ 已有 `validate:all` 和 `validate:watch` 脚本

### 需要新增的组件

```
lint-scripts/
├── validators/
│   ├── server-rpc.validator.ts      # 新增：服务端 RPC 规范检查
│   ├── client-rpc.validator.ts      # 新增：客户端 RPC 调用检查
│   └── directory-structure.validator.ts  # 新增：目录结构检查
├── config/
│   └── project.config.ts            # 更新：添加新配置
└── validate-all.ts                  # 更新：集成新验证器
```

## 📝 详细实施步骤

### 第一步：创建服务端 RPC 规范验证器

**文件**：`lint-scripts/validators/server-rpc.validator.ts`

**检查规则**：
1. 路由文件必须使用 OpenAPIHono 链式语法
2. 必须使用 `.openapi(route, handler)` 模式
3. 禁止单独创建 Hono 实例后逐个添加路由
4. 必须导出路由类型供客户端使用

**检查模式**：
```typescript
// ✅ 正确：链式语法
export const apiRoutes = new OpenAPIHono()
  .openapi(listRoute, handler1)
  .openapi(getRoute, handler2)

// ❌ 错误：非链式
const app = new OpenAPIHono()
app.openapi(listRoute, handler1)
app.openapi(getRoute, handler2)
```

**实现要点**：
- 扫描 `src/server/**/*routes*.ts` 文件
- 检测是否使用 `new OpenAPIHono()` 后立即链式调用
- 检测是否有 `const app = new OpenAPIHono()` 后单独调用 `app.openapi()`
- 验证是否导出了路由类型

### 第二步：创建客户端 RPC 调用验证器

**文件**：`lint-scripts/validators/client-rpc.validator.ts`

**检查规则**：
1. 客户端必须使用 `apiClient` 进行 API 调用
2. 必须使用 `$get()`, `$post()` 等类型安全方法
3. 禁止使用 `fetch()` 直接调用 API
4. 禁止硬编码 API 路径

**检查模式**：
```typescript
// ✅ 正确：使用 apiClient
const response = await apiClient.api.todos.$get()
const result = await response.json()

// ❌ 错误：直接 fetch
const response = await fetch('/api/todos')

// ❌ 错误：硬编码路径
const response = await apiClient.api['todos'].$get()
```

**实现要点**：
- 扫描 `src/client/**/*.{ts,tsx}` 文件
- 检测是否有 `fetch(` 调用（排除外部 API）
- 检测是否使用 `apiClient` 的类型安全方法
- 验证是否有类型推导（通过检查是否使用 `$` 方法）

### 第三步：创建目录结构验证器

**文件**：`lint-scripts/validators/directory-structure.validator.ts`

**检查规则**：
```
src/
├── server/
│   ├── module-{feature}/
│   │   ├── routes/          # 路由文件必须在这里
│   │   ├── services/        # 服务文件必须在这里
│   │   └── __tests__/       # 测试文件必须在这里
│   └── routes/              # 全局路由
├── client/
│   ├── services/            # 服务层
│   ├── stores/              # 状态管理
│   ├── hooks/               # React Hooks
│   └── components/          # UI 组件
└── shared/
    ├── schemas/             # Zod schemas
    └── types/               # TypeScript 类型
```

**实现要点**：
- 检查路由文件是否在 `routes/` 目录
- 检查服务文件是否在 `services/` 目录
- 检查测试文件是否在 `__tests__/` 目录
- 检查共享类型是否在 `shared/` 目录

### 第四步：更新配置文件

**文件**：`lint-scripts/config/project.config.ts`

**新增配置**：
```typescript
export const serverRPCConfig: ServerRPCConfig = {
  checkDirs: ['src/server'],
  ignoreDirs: ['node_modules', 'dist', '__tests__'],
  requireChainSyntax: true,
  requireTypeExport: true,
};

export const clientRPCConfig: ClientRPCConfig = {
  checkDirs: ['src/client'],
  ignoreDirs: ['node_modules', 'dist', '__tests__'],
  requireAPIClient: true,
  forbidDirectFetch: true,
};

export const directoryStructureConfig: DirectoryStructureConfig = {
  rules: [
    { pattern: '*routes*.ts', requiredDir: 'routes' },
    { pattern: '*service*.ts', requiredDir: 'services' },
    { pattern: '*.test.ts', requiredDir: '__tests__' },
  ],
  ignoreDirs: ['node_modules', 'dist'],
};
```

### 第五步：更新 validate-all.ts

**集成新验证器**：
```typescript
// 新增导入
import { validateServerRPC, formatServerRPCErrors } from './validators/server-rpc.validator.js';
import { validateClientRPC, formatClientRPCErrors } from './validators/client-rpc.validator.js';
import { validateDirectoryStructure, formatDirectoryErrors } from './validators/directory-structure.validator.js';

// 在 runAllValidators 中添加
// 4. 服务端 RPC 验证
console.log('🔍 [4/6] Checking server RPC patterns...');
const serverRPCErrors = validateServerRPC(projectConfig.serverRPC, rootPath);
results.push({
  name: 'Server RPC',
  passed: serverRPCErrors.length === 0,
  errors: serverRPCErrors.length,
});

// 5. 客户端 RPC 验证
console.log('🔍 [5/6] Checking client RPC usage...');
const clientRPCErrors = validateClientRPC(projectConfig.clientRPC, rootPath);
results.push({
  name: 'Client RPC',
  passed: clientRPCErrors.length === 0,
  errors: clientRPCErrors.length,
});

// 6. 目录结构验证
console.log('🔍 [6/6] Checking directory structure...');
const directoryErrors = validateDirectoryStructure(projectConfig.directory, rootPath);
results.push({
  name: 'Directory Structure',
  passed: directoryErrors.length === 0,
  errors: directoryErrors.length,
});
```

### 第六步：创建 Claude Code Hook 脚本

**文件**：`.claude/scripts/post-edit-check.sh`

```bash
#!/bin/bash

# Claude Code Post-Edit Check Script
# 在每次编辑后自动运行验证

set -e

echo "🚀 Running post-edit validation..."
echo ""

# 运行所有验证器
npm run validate:all

# 如果验证失败，阻止操作
if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Validation failed! Please fix the errors before proceeding."
  exit 1
fi

echo ""
echo "✅ All validations passed!"
```

**权限设置**：
```bash
chmod +x .claude/scripts/post-edit-check.sh
```

### 第七步：更新 Claude Code 配置

**文件**：`.claude/settings.json` 或 `.claude/settings.local.json`

```json
{
  "hooks": {
    "afterToolUse": [
      {
        "type": "command",
        "command": "bash .claude/scripts/post-edit-check.sh"
      }
    ]
  }
}
```

**注意**：使用相对路径 `bash .claude/scripts/post-edit-check.sh` 而不是绝对路径，这样更通用。

### 第八步：更新 Husky Pre-commit Hook

**文件**：`.husky/pre-commit`

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "Running TypeScript type check..."
npm run typecheck

echo "Running all validators..."
npm run validate:all

npx lint-staged

echo "Running smart tests for changed files..."
npm run test:smart:staged
```

### 第九步：更新 package.json

**文件**：`package.json`

**更新 lint-staged 配置**：
```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": [
      "prettier --write",
      "eslint --fix",
      "eslint --max-warnings=0"
    ],
    "*.{json,md,css}": [
      "prettier --write"
    ],
    "src/server/**/*routes*.ts": [
      "npm run validate:all"
    ],
    "src/client/**/*.{ts,tsx}": [
      "npm run validate:all"
    ]
  }
}
```

### 第十步：创建验证器类型定义

**文件**：`lint-scripts/validators/index.ts`

**新增类型**：
```typescript
// ============================================
// 服务端 RPC 验证配置
// ============================================
export interface ServerRPCConfig {
  checkDirs: string[];
  ignoreDirs: string[];
  requireChainSyntax: boolean;
  requireTypeExport: boolean;
}

export interface ServerRPCError {
  file: string;
  line: number;
  message: string;
  suggestion: string;
}

// ============================================
// 客户端 RPC 验证配置
// ============================================
export interface ClientRPCConfig {
  checkDirs: string[];
  ignoreDirs: string[];
  requireAPIClient: boolean;
  forbidDirectFetch: boolean;
}

export interface ClientRPCError {
  file: string;
  line: number;
  message: string;
  suggestion: string;
}

// ============================================
// 目录结构验证配置
// ============================================
export interface DirectoryRule {
  pattern: string;
  requiredDir: string;
}

export interface DirectoryStructureConfig {
  rules: DirectoryRule[];
  ignoreDirs: string[];
}

export interface DirectoryError {
  file: string;
  expectedDir: string;
  actualDir: string;
}
```

## 🔄 工作流程

### Claude Code 编辑流程
```
用户编辑代码
    ↓
Claude Code 完成编辑
    ↓
触发 afterToolUse hook
    ↓
运行 post-edit-check.sh
    ↓
执行 validate:all
    ↓
检查结果
    ├─ 通过 → 继续
    └─ 失败 → 显示错误，提示修复
```

### Git Commit 流程
```
git commit
    ↓
触发 pre-commit hook
    ↓
运行 typecheck
    ↓
运行 validate:all
    ↓
运行 lint-staged
    ↓
运行 test:smart:staged
    ↓
检查结果
    ├─ 全部通过 → 允许 commit
    └─ 任一失败 → 阻止 commit
```

## 📊 验证器优先级

1. **高优先级**（必须通过）
   - 服务端 RPC 规范
   - 客户端 RPC 调用
   - 敏感信息检查

2. **中优先级**（建议通过）
   - 导入路径检查
   - 目录结构检查

3. **低优先级**（警告）
   - TODO/FIXME 检查

## ⚠️ 注意事项

1. **性能考虑**
   - validate:all 应该快速执行（< 5秒）
   - 可以考虑增量验证（只检查修改的文件）
   - watch 模式下使用防抖

2. **错误处理**
   - 清晰的错误信息
   - 提供修复建议
   - 显示相关文档链接

3. **可配置性**
   - 允许通过配置文件调整规则
   - 支持忽略特定文件或目录
   - 可以临时禁用某些检查

4. **兼容性**
   - 确保 CI/CD 环境也能运行
   - 支持不同的操作系统
   - 处理边缘情况

## 🎯 成功标准

1. ✅ 每次编辑后自动运行验证
2. ✅ Commit 前自动运行验证
3. ✅ 错误信息清晰易懂
4. ✅ 验证速度快（< 5秒）
5. ✅ 可以通过配置调整规则
6. ✅ 不影响正常开发流程

## 📚 参考文档

- [Claude Code Hooks 文档](https://docs.anthropic.com/claude-code/hooks)
- [Husky 文档](https://typicode.github.io/husky/)
- [Hono RPC 文档](https://hono.dev/guides/rpc)
- [项目现有规范](.claude/rules/)

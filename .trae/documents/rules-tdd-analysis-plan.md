# 规则文档与测试用例 TDD 规范分析计划

## 一、当前状态分析

### 1. 规则文档现状

| 规则文件 | 主要内容 | 测试用例 | TDD 规范 |
|---------|---------|---------|---------|
| `60-testing-standards.md` | 测试框架、类型安全客户端、覆盖率目标 | ✅ 有测试 | ⚠️ 部分（有示例代码） |
| `61-hono-testing.md` | HTTP/SSE/WebSocket 测试模式 | ❌ 无独立测试 | ⚠️ 部分（有示例代码） |
| `30-client-components.md` | 组件设计、Props、样式规范 | ✅ 有测试 | ⚠️ 部分 |
| `32-client-state-zustand.md` | Store 设计、选择性订阅 | ✅ 有测试 | ⚠️ 部分（有示例代码） |
| `20-server-api.md` | 路由、Service、中间件规范 | ✅ 有测试 | ⚠️ 部分 |
| **`62-tdd-red-green.md`** | **TDD 红-绿-重构循环规范** | **✅ 有验证器** | **✅ 完整** |

### 2. ESLint 规则测试现状

| 测试文件 | 覆盖规则 | TDD 规范遵循情况 |
|---------|---------|-----------------|
| `layer-boundary.test.ts` | `layer-boundary` | ✅ 良好（有 valid/invalid 分组） |
| `enforce-valid-method.test.ts` | `enforce-valid-method` | ✅ 良好（有 valid/invalid 分组） |
| `module-boundary.test.ts` | `module-boundary` | ✅ 良好 |
| `no-direct-zod-import-in-file-routes.test.ts` | `no-direct-zod-import` | ✅ 良好 |

### 3. lint-scripts 验证器测试现状

| 文件 | 内容 | TDD 规范 |
|-----|------|---------|
| `TESTING.md` | 验证器测试指南 | ✅ 良好（有测试方法、检查清单） |
| `validators/*.ts` | 验证器实现 | ✅ 已补充单元测试 |
| **`validators/tdd-validator.ts`** | **TDD 红绿灯验证器** | **✅ 已实现** |

---

## 二、已完成的实施内容

### ✅ 步骤 1：创建 TDD 红绿灯验证器

**文件**: `lint-scripts/validators/tdd-validator.ts`

**检测规则**:

| 违规类型 | 说明 | 检测方式 |
|---------|------|---------|
| `missing_test` | 新增源文件缺少测试 | 检查是否存在对应的测试文件 |
| `test_after_impl` | 测试在实现之后创建 | 比较文件首次提交时间 |
| `skipped_test` | 测试被跳过 | 检测 `.skip()` 和 `.only()` |
| `no_assertions` | 测试无断言 | 检测 `expect()` 等 |

### ✅ 步骤 2：增强 Pre-commit Hook

**文件**: `.husky/pre-commit`

```bash
# 新增 TDD 检查步骤
echo "Checking TDD red-green-refactor compliance..."
npm run validate:tdd
```

### ✅ 步骤 3：创建 TDD 规则文档

**文件**: `.claude/rules/62-tdd-red-green.md`

**内容**:
- 🔴 红灯阶段规则（先写测试）
- 🟢 绿灯阶段规则（最小实现）
- 🔵 重构阶段规则（保持测试通过）
- 🚫 禁止事项清单
- 📊 TDD 工作流图
- 📋 TDD Checklist

### ✅ 步骤 4：添加 npm 脚本

**文件**: `package.json`

```json
{
  "scripts": {
    "validate:tdd": "node --import tsx/esm lint-scripts/validators/tdd-validator.ts"
  }
}
```

### ✅ 步骤 5：为规则文档补充测试用例

**目录结构**：
```
lint-scripts/validators/__tests__/
├── 60-testing-standards.test.ts    # 测试规范验证
├── 20-server-api.test.ts           # API 规范验证
├── 30-client-components.test.ts    # 组件规范验证
└── 32-client-state-zustand.test.ts # Store 规范验证
```

### ✅ 步骤 6：增强 ESLint 错误提示

已修改的 ESLint 规则，添加文档链接：

| 文件 | 文档链接 |
|------|---------|
| `require-type-safe-test-client.js` | `.claude/rules/60-testing-standards.md#type-safe-client` |
| `prefer-shared-types.js` | `.claude/rules/40-shared-types.md` |
| `layer-boundary.js` | `.claude/rules/20-server-api.md#layer-boundary` |
| `no-direct-fetch.js` | 已有文档链接 |

---

## 三、待验证的内容

### 1. TDD 验证器功能验证

```bash
npm run validate:tdd
```

**验证点**：
- [ ] 能否检测新增源文件缺少测试
- [ ] 能否检测测试文件在源文件之后创建
- [ ] 能否检测跳过的测试（.skip/.only）
- [ ] 能否检测无断言的测试

### 2. 测试用例运行验证

```bash
npm run test:unit -- lint-scripts/validators/__tests__
```

**验证点**：
- [ ] 60-testing-standards.test.ts 测试通过
- [ ] 20-server-api.test.ts 测试通过
- [ ] 30-client-components.test.ts 测试通过
- [ ] 32-client-state-zustand.test.ts 测试通过

### 3. ESLint 错误提示验证

```bash
npm run lint
```

**验证点**：
- [ ] 错误提示包含 📚 Documentation 链接
- [ ] 错误提示包含 💡 建议

---

## 四、TDD 红绿灯验证器使用说明

### 命令

```bash
# 手动检查 TDD 合规性
npm run validate:tdd

# 提交时自动检查（已集成到 pre-commit hook）
git commit
```

### 输出示例

```
🔍 TDD 红绿灯规则检查

============================================================

❌ TDD 违规检测到！

📋 违规类型: missing_test
   源文件: src/server/module-todos/services/todo-service.ts
   问题: 新增源文件缺少对应的测试文件

   💡 建议: 请先为该文件创建测试文件，遵循 TDD 红-绿-重构循环
   📚 文档: .claude/rules/62-tdd-red-green.md

   预期测试文件位置:
     - src/server/module-todos/services/__tests__/todo-service.test.ts
     - src/server/module-todos/__tests__/todo-service.test.ts

============================================================

📊 统计:
   源文件变更: 1
   测试文件变更: 0
   新增源文件: 1
   新增测试文件: 0
   TDD 合规文件: 0/1

❌ TDD compliance: FAILED

💡 提示: TDD 红-绿-重构循环要求:
   1. 🔴 先写测试（红灯）- 测试应该失败
   2. 🟢 写实现代码（绿灯）- 测试应该通过
   3. 🔵 重构代码 - 保持测试通过
```

---

## 五、工作量统计（最终）

| 任务 | 预计时间 | 优先级 | 状态 |
|------|---------|--------|------|
| 创建 TDD 验证器 | 2h | P0 | ✅ 已完成 |
| 增强 pre-commit hook | 0.5h | P0 | ✅ 已完成 |
| 创建 TDD 规则文档 | 1h | P0 | ✅ 已完成 |
| 添加 npm 脚本 | 0.2h | P0 | ✅ 已完成 |
| 补充测试用例（4个规则） | 4h | P1 | ✅ 已完成 |
| 增强 ESLint 错误提示（4个规则） | 2h | P2 | ✅ 已完成 |
| **已完成** | **9.7h** | - | - |

---

## 六、验证方法

1. **TDD 验证**
   ```bash
   npm run validate:tdd
   ```

2. **测试用例验证**
   ```bash
   npm run test:unit -- lint-scripts/validators/__tests__
   ```

3. **ESLint 规则验证**
   ```bash
   npm run lint
   ```

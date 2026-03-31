# 模版项目质量改进方案

## Why

根据对 template 项目的多维度分析，发现以下核心问题需要解决：

1. **架构问题**: 存在循环依赖（agentStore ↔ apiClient）、服务层与 UI 层耦合紧密
2. **测试覆盖不足**: 仅 todoStore 有测试，agentStore、authStore 等核心 store 缺失测试
3. **代码规范执行不一致**: 部分代码仍使用 any 类型，违反规则文件定义的标准

## What Changes

### Phase 1: 消除循环依赖

- [ ] 重构 `src/client/stores/agentStore.ts`，移除对 apiClient 的直接依赖
- [ ] 将 API 调用逻辑提取到 service 层
- [ ] 通过事件/回调机制解耦 store 与 apiClient

### Phase 2: 补充测试覆盖

- [ ] 为 `agentStore` 创建测试文件 `__tests__/agentStore.test.ts`
- [ ] 为 `authStore` 创建测试文件 `__tests__/authStore.test.ts`
- [ ] 为 `chatWSStore` 创建测试文件 `__tests__/chatWSStore.test.ts`
- [ ] 补充错误场景和边界条件测试
- [ ] 确保所有测试符合 `60-testing-standards.md` 规范

### Phase 3: 强化类型安全

- [ ] 扫描并修复所有使用 `any` 类型的代码
- [ ] 为 `apiClient.ts` 添加严格类型约束
- [ ] 确保所有 store 遵循 `32-client-state-zustand.md` 规范

### Phase 4: 统一代码规范

- [ ] 统一 stores 目录下的命名规范
- [ ] 确保导入路径一致性
- [ ] 完善 ESLint 规则文档（可选）

## Impact

### Affected Files

- `src/client/stores/agentStore.ts` - 重构解耦
- `src/client/stores/authStore.ts` - 新增测试
- `src/client/stores/chatWSStore.ts` - 新增测试
- `src/client/services/apiClient.ts` - 类型强化
- `src/client/components/__tests__/*.test.tsx` - 补充测试

### 规则文件参考

- `60-testing-standards.md` - 测试标准
- `32-client-state-zustand.md` - 状态管理规范
- `31-client-services.md` - 客户端服务规范

---

## ADDED Requirements

### Requirement: 循环依赖消除

Store 层不应直接依赖 apiClient，应通过 service 层间接调用 API。

#### Scenario: Store 调用 API

- **WHEN** store 需要获取远程数据
- **THEN** 应通过注入的 service 回调获取数据，而不是直接调用 apiClient

#### Scenario: Service 层抽象

- **WHEN** API 调用逻辑需要复用
- **THEN** 应创建独立的 service 文件，store 通过回调接收结果

### Requirement: 测试覆盖率

所有核心 store 必须有对应的单元测试。

#### Scenario: Store 初始状态测试

- **WHEN** 创建新的 store
- **THEN** 必须创建对应的 `*.test.ts` 文件
- **AND** 测试初始状态、各 action 的结果

#### Scenario: 测试必须使用 createTestClient

- **WHEN** 编写服务端测试
- **THEN** 必须使用 `createTestClient()` 获取类型安全客户端
- **AND** 禁止使用 fetch 或 app.request

### Requirement: 类型安全

禁止在业务代码中使用 `any` 类型。

#### Scenario: 类型推断

- **WHEN** API 返回 JSON 数据
- **THEN** 应使用类型守卫进行类型收窄
- **AND** 禁止使用 `as any` 类型断言

---

## MODIFIED Requirements

### Requirement: Store 导出规范 (来自 32-client-state-zustand.md)

**原规范**: Store 可使用默认导出
**修改为**: 必须使用命名导出，禁止默认导出

### Requirement: 测试禁止事项 (来自 60-testing-standards.md)

**原规范**: 禁止使用 `it.skip` 和 `it.only`
**强化为**: 发现此类用法必须立即修复或删除测试

---

## REMOVED Requirements

无

---

## 验证标准

1. `npm run typecheck` 无类型错误
2. `npm run test` 所有测试通过
3. ESLint 检查无循环依赖警告
4. 测试覆盖率 > 80%

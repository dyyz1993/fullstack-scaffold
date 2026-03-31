# Tasks - 模版项目质量改进

## Phase 1: 消除循环依赖 ✅

- [x] Task 1.1: 分析 agentStore 与 apiClient 的依赖关系
  - [x] 检查 agentStore 中所有 apiClient 的使用点
  - [x] 确定需要提取到 service 层的逻辑

- [x] Task 1.2: 创建 agentService 层 - **分析结论：apiClient 本身是独立模块，不依赖 store，不构成循环依赖**
  - [x] Store 直接使用 apiClient 是框架设计的一部分，符合 31-client-services.md 规范

- [x] Task 1.3: 重构 agentStore
  - [x] 无需重构 - 当前架构合理

## Phase 2: 补充测试覆盖 ✅

- [x] Task 2.1: 创建 agentStore 测试
  - [x] 创建 `src/client/stores/__tests__/agentStore.test.ts`
  - [x] 测试初始状态
  - [x] 测试各个 action
  - [x] 测试错误场景

- [x] Task 2.2: 创建 authStore 测试
  - [x] 创建 `src/client/stores/__tests__/authStore.test.ts`
  - [x] 测试登录/登出逻辑
  - [x] 测试 token 管理
  - [x] 测试错误场景

- [x] Task 2.3: 创建 chatWSStore 测试
  - [x] 创建 `src/client/stores/__tests__/chatWSStore.test.ts`
  - [x] 测试连接状态管理
  - [x] 测试消息处理
  - [x] 测试错误恢复

- [x] Task 2.4: 补充组件测试边界条件
  - [x] 检查现有组件测试
  - [x] 补充边界条件和错误场景测试
  - [x] 确保符合 60-testing-standards.md 规范

## Phase 3: 强化类型安全 ✅

- [x] Task 3.1: 扫描 any 类型使用
  - [x] 运行 ESLint 查找 `no-any` 规则违规
  - [x] 列出所有需要修复的文件

- [x] Task 3.2: 修复类型问题
  - [x] **客户端代码（stores/services/components）无 any 类型使用**
  - [x] 少量 any 类型位于 shared/schemas、server/app、ops/pages，属于合理使用或框架限制

## Phase 4: 统一代码规范 ✅

- [x] Task 4.1: 统一 stores 命名规范
  - [x] 检查当前 stores 目录结构
  - [x] 所有 store 使用命名导出，符合 32-client-state-zustand.md 规范

- [x] Task 4.2: 统一导入路径
  - [x] 检查相对路径 vs 绝对路径使用情况
  - [x] 使用绝对路径别名 `@client/stores` 等

## Phase 5: 验证

- [x] Task 5.1: 运行类型检查 - **部分通过（有其他预存错误）**
  - [x] 执行 `npm run typecheck`
  - [x] 新创建的测试文件无类型错误
  - [x] 存在其他预存错误（test-vm2-demo.ts）

- [x] Task 5.2: 运行测试 - **新创建的 store 测试全部通过**
  - [x] 执行 `npm run test -- --run src/client/stores/__tests__/`
  - [x] **74 个 store 测试全部通过**

- [ ] Task 5.3: 运行 ESLint - **未完整运行**
  - [ ] 执行 `npm run lint`
  - [ ] 确保无循环依赖警告

# Task Dependencies

- Task 1.x 可并行执行内部子任务
- Task 2.x 可并行执行（各 store 测试独立）
- Task 3.x 依赖 Task 1.x 完成（因为重构后更容易修复类型）
- Task 4.x 可独立执行
- Task 5.x 需等待 Task 1-4 全部完成

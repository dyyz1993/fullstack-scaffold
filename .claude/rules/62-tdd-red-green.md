---
paths: src/**/*.test.ts, src/**/*.test.tsx, src/**/__tests__/**/*.ts
---

# TDD 红-绿-重构 循环规范

## 🎯 核心原则

TDD（测试驱动开发）遵循 **红-绿-重构** 循环，确保代码质量和测试覆盖率。

```
🔴 RED    → 先写测试，测试应该失败
🟢 GREEN   → 写最少的代码让测试通过
🔵 REFACTOR → 重构代码，保持测试通过
```

## 📋 TDD Checklist

每次提交代码前，请确保：

- [ ] 新增源文件有对应的测试文件
- [ ] 测试文件在源文件之前创建
- [ ] 所有测试都能运行（无 .skip 或 .only）
- [ ] 测试包含有效的断言
- [ ] 测试覆盖率 > 80%

## 🔴 红灯阶段（RED）

### 规则：先写测试

**要求**：在编写实现代码之前，必须先编写测试代码。

```typescript
// ✅ 正确 - 先写测试
// 1. 创建测试文件 src/server/module-todos/__tests__/todo-service.test.ts
describe('TodoService', () => {
  it('should create todo', async () => {
    const input = { title: 'New Todo' }
    const result = await createTodo(input)
    expect(result.id).toBeDefined()
    expect(result.title).toBe('New Todo')
  })
})

// 2. 运行测试，确认失败（红灯）
// npm run test
// ❌ FAIL: createTodo is not defined
```

```typescript
// ❌ 错误 - 先写实现
// 1. 直接写实现
export async function createTodo(input: CreateTodoInput): Promise<Todo> {
  // ...
}

// 2. 后写测试（违反 TDD）
describe('TodoService', () => {
  // ...
})
```

### 验证方式

Git 提交历史检查：测试文件的首次提交应该早于或等于源文件的首次提交。

```bash
# 检查测试是否先于实现
git log --format=%H --reverse -- "src/**/__tests__/*.test.ts"
git log --format=%H --reverse -- "src/**/services/*.ts"
```

## 🟢 绿灯阶段（GREEN）

### 规则：写最少的代码让测试通过

**要求**：只写足够让测试通过的代码，不要过度设计。

```typescript
// ✅ 正确 - 最小实现
export async function createTodo(input: CreateTodoInput): Promise<Todo> {
  return {
    id: 1,
    title: input.title,
    completed: false,
    createdAt: new Date(),
  }
}
```

```typescript
// ❌ 错误 - 过度设计
export async function createTodo(input: CreateTodoInput): Promise<Todo> {
  // 不要在测试通过前添加额外功能
  await validateInput(input) // ❌ 测试没要求
  await checkPermissions() // ❌ 测试没要求
  await sendNotification() // ❌ 测试没要求
  // ...
}
```

## 🔵 重构阶段（REFACTOR）

### 规则：在测试通过后重构

**要求**：重构时保持测试通过，每次小改动后运行测试。

```typescript
// ✅ 正确 - 小步重构
// 1. 提取函数
// 2. 运行测试 ✅
// 3. 重命名变量
// 4. 运行测试 ✅
// 5. 优化结构
// 6. 运行测试 ✅
```

## 🚫 禁止事项

### 1. 禁止跳过测试

```typescript
// ❌ 禁止
it.skip('should work', () => { ... })
describe.skip('TodoService', () => { ... })
test.skip('should pass', () => { ... })

// ❌ 禁止
it.only('this test', () => { ... })
describe.only('TodoService', () => { ... })
```

### 2. 禁止无断言的测试

```typescript
// ❌ 禁止 - 没有断言
it('should create todo', async () => {
  await createTodo({ title: 'Test' })
  // 没有 expect!
})

// ✅ 正确 - 有断言
it('should create todo', async () => {
  const result = await createTodo({ title: 'Test' })
  expect(result.id).toBeDefined()
})
```

### 3. 禁止先实现后测试

```bash
# ❌ 错误顺序
git commit -m "feat: add createTodo service"     # 先提交实现
git commit -m "test: add tests for createTodo"   # 后提交测试

# ✅ 正确顺序
git commit -m "test: add failing tests for createTodo"  # 先提交测试（红灯）
git commit -m "feat: implement createTodo service"      # 后提交实现（绿灯）
```

## 🔧 自动化验证

### Pre-commit Hook

每次提交时自动检查 TDD 合规性：

```bash
npm run validate:tdd
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

## 📚 相关文档

- [Testing 开发规范](./60-testing-standards.md) - 测试框架和类型安全
- [Hono 测试最佳实践](./61-hono-testing.md) - HTTP/SSE/WebSocket 测试
- [Server API 规范](./20-server-api.md) - 服务端开发规范

## 🔗 相关 ESLint 规则

- `require-type-safe-test-client` - 强制使用类型安全测试客户端
- `no-disable-type-safe-client` - 禁止禁用类型安全检查

## 📊 TDD 工作流图

```
┌─────────────────────────────────────────────────────────────┐
│                    TDD 红-绿-重构循环                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│    ┌─────────┐     ┌─────────┐     ┌─────────┐            │
│    │  🔴 RED │ ──► │🟢 GREEN │ ──► │🔵 REFACTOR│            │
│    │ 写测试  │     │ 写实现  │     │  重构   │            │
│    │ (失败)  │     │ (通过)  │     │ (通过)  │            │
│    └─────────┘     └─────────┘     └─────────┘            │
│         ▲                                  │               │
│         └──────────────────────────────────┘               │
│                    重复循环                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 TDD 最佳实践

### 1. 测试命名规范

```typescript
// ✅ 正确 - 使用 should + 动词
it('should create todo when given valid input', () => {})
it('should throw error when title is empty', () => {})

// ❌ 错误 - 模糊的命名
it('test1', () => {})
it('works', () => {})
```

### 2. 测试结构（AAA 模式）

```typescript
it('should create todo', async () => {
  // Arrange - 准备
  const input = { title: 'New Todo' }

  // Act - 执行
  const result = await createTodo(input)

  // Assert - 断言
  expect(result.id).toBeDefined()
  expect(result.title).toBe('New Todo')
})
```

### 3. 一个测试一个断言（推荐）

```typescript
// ✅ 正确 - 一个测试验证一个行为
it('should return todo id', async () => {
  const result = await createTodo({ title: 'Test' })
  expect(result.id).toBeDefined()
})

it('should set correct title', async () => {
  const result = await createTodo({ title: 'Test' })
  expect(result.title).toBe('Test')
})

// ⚠️ 可接受 - 多个相关断言
it('should create todo with correct properties', async () => {
  const result = await createTodo({ title: 'Test' })
  expect(result.id).toBeDefined()
  expect(result.title).toBe('Test')
  expect(result.completed).toBe(false)
})
```

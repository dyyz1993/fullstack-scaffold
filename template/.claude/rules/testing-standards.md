---
paths: src/**/*.test.ts, src/**/*.test.tsx
---

# Testing Standards

## 📂 Organization & Location

### 测试文件位置

统一使用 `__tests__/` 子目录存放测试文件：

- **客户端**: `src/client/**/*.ts` → `src/client/**/__tests__/*.test.ts`
  - `src/client/stores/todoStore.ts` → `src/client/stores/__tests__/todoStore.test.ts`
  - `src/client/services/apiClient.ts` → `src/client/services/__tests__/apiClient.test.ts`

- **服务端**: `src/server/module-{feature}/**/*.ts` → `src/server/module-{feature}/__tests__/*.test.ts`
  - `src/server/module-todos/routes/todos-routes.ts` → `src/server/module-todos/__tests__/todos-route.test.ts`
  - `src/server/module-todos/services/todo-service.ts` → `src/server/module-todos/__tests__/todo-service.test.ts`
- **集成测试**: `src/server/__tests__/integration/*.test.ts`
- **E2E 测试**: `e2e/*.spec.ts` (Playwright)

### 目录结构示例

```
e2e/
  todo.spec.ts
src/
  client/
    stores/
      todoStore.ts
      __tests__/
        todoStore.test.ts
    services/
      apiClient.ts
      __tests__/
        apiClient.test.ts
  server/
    __tests__/
      integration/
        todos-api.test.ts
    module-todos/
      routes/
        todos-routes.ts
        __tests__/
          todos-routes.test.ts
      services/
        todo-service.ts
        __tests__/
          todo-service.test.ts
```

## 🧪 Test Writing Standards

### Vitest 配置

- **配置文件**: `vitest.config.ts` (单元测试), `vitest.integration.config.ts` (集成测试)
- **Setup 文件**: `vitest.setup.ts` (单元测试), `vitest.integration.setup.ts` (集成测试)
- **测试环境**: jsdom (客户端) / node (服务端)
- **路径别名**: 已配置 `@shared`, `@client`, `@server`

### 🛡 Coverage & Assertion Requirements

### 🚫 禁止简单的真值断言

**核心原则**: 测试必须验证具体数值，而非简单的 true/false/0/1

```typescript
// ❌ 错误 - 过于简单，没有验证实际业务逻辑
expect(result.success).toBe(true);
expect(data.length).toBeGreaterThan(0);
expect(todo.completed).toBe(true);

// ✅ 正确 - 验证具体的业务值
expect(result).toEqual({
  success: true,
  data: {
    id: 1,
    title: 'Buy groceries',
    status: 'pending',
  },
});
expect(data.items).toHaveLength(3);
expect(data.items[0].title).toBe('Buy groceries');
expect(todo.status).toBe('completed');
```

### ✅ 断言数量要求

**每个测试必须包含 2-3 个具体数值的断言**

**覆盖率目标：>80%**

```typescript
// ✅ 正确 - 验证多个具体字段
it('应当创建新 Todo 并设置初始属性', async () => {
  const todo = await createTodo({
    title: 'Test Todo',
    description: 'Test description',
  });

  // 验证 ID 生成
  expect(todo.id).toBeGreaterThan(0);

  // 验证所有字段
  expect(todo.title).toBe('Test Todo');
  expect(todo.description).toBe('Test description');
  expect(todo.status).toBe('pending');

  // 验证时间戳
  expect(todo.createdAt).toBeLessThanOrEqual(Date.now());
});

// ❌ 错误 - 仅一个简单断言
it('应当创建 Todo', async () => {
  const todo = await createTodo({ title: 'Test' });
  expect(todo).toBeTruthy(); // 没有验证任何实际属性
});
```

### 🔄 生命周期管理（强制）

**必须使用 beforeEach 和 afterEach**

```typescript
describe('TodoService', () => {
  let testDb: any;

  beforeEach(() => {
    // 前置处理：初始化测试数据库
    testDb = createTestDatabase();
  });

  afterEach(() => {
    // 后置清理：销毁数据，重置状态
    testDb?.destroy?.();
    testDb = null;

    // 清除所有 mock
    vi.clearAllMocks();
  });

  it('应当创建新 Todo', async () => {
    const todo = await service.createTodo({
      title: 'Test Todo',
      status: 'pending',
    });

    // 验证具体数值
    expect(todo.id).toBeGreaterThan(0);
    expect(todo.title).toBe('Test Todo');
    expect(todo.status).toBe('pending');
  });
});
```

### 测试用例类型

- **正向用例**: 验证成功场景 (Status 200)
- **业务逻辑验证**:
  - 数据内容: `expect(json.data.title).toBe('Buy groceries')`
  - 数值验证: `expect(json.data.count).toBe(5)`
  - 状态标志: `expect(json.data.completed).toBe(true)`
  - 副作用: 写操作后通过读操作验证结果
- **验证用例**: 验证输入校验 (Status 400)
- **错误用例**: 验证错误处理 (Status 404/500)

### 示例

```typescript
describe('TodoService', () => {
  beforeEach(() => {
    // 初始化测试状态
    initializeTestDatabase();
  });

  it('应当创建 Todo 并设置默认状态', () => {
    const todo = createTodo({
      title: 'Buy milk',
      description: '2% milk',
    });

    // 验证具体数值
    expect(todo.id).toBe(1);
    expect(todo.title).toBe('Buy milk');
    expect(todo.description).toBe('2% milk');
    expect(todo.status).toBe('pending'); // 默认状态
    expect(todo.completed).toBe(false);
  });

  it('应当更新 Todo 状态', () => {
    const todo = createTodo({ title: 'Test' });
    const updated = updateTodoStatus(todo.id, 'completed');

    // 验证更新的值
    expect(updated.status).toBe('completed');
    expect(updated.completed).toBe(true);

    // 验证时间戳更新
    expect(updated.updatedAt).toBeGreaterThan(todo.updatedAt);
  });

  afterEach(() => {
    // 清理
    cleanupTestDatabase();
  });
});
```

## 🌐 E2E 测试规范 (Playwright)

### E2E 测试适用场景

使用 Playwright 进行端到端测试的场景：

| 场景           | 示例                              | 不适用           |
| -------------- | --------------------------------- | ---------------- |
| 多页面用户流程 | 创建 → 编辑 → 完成 Todo           | 单组件交互       |
| 跨页面状态     | 筛选条件在不同页面保持一致          | 状态管理逻辑     |
| 真实浏览器行为 | 网络请求、本地存储                | 可用 mock 替代   |

### E2E 测试规则

**🚫 禁止使用 `--headed` 参数**

```bash
# ❌ 禁止 - 会打开浏览器窗口
npx playwright test --headed

# ✅ 正确 - 无头模式运行
npx playwright test
```

### E2E 测试编写规范

#### 1. 数据验证原则

```typescript
// ✅ 正确 - 验证具体数值
test('should display todo list with correct data', async ({ page }) => {
  await page.goto('/');

  // 验证 Todo 数量
  await expect(page.locator('.todo-item')).toHaveCount(3);

  // 验证第一个 Todo 的内容
  await expect(page.locator('.todo-item').first()).toHaveText('Buy groceries');
  await expect(page.locator('.todo-item').nth(1)).toHaveText('Clean house');
});

// ❌ 错误 - 过于简单
test('should display todos', async ({ page }) => {
  await page.goto('/');
  const element = await page.$('.todo-item');
  expect(element).toBeTruthy(); // 没有验证实际内容
});
```

#### 2. 使用 data-testid 选择器

```typescript
// ✅ 正确 - 使用稳定的 data-testid
await page.click('[data-testid="add-todo-button"]');
await page.fill('[data-testid="todo-title-input"]', 'Buy groceries');

// ❌ 错误 - 使用不稳定的 CSS 类
await page.click('.btn-primary'); // 类名可能变化
```

#### 3. 生命周期管理

```typescript
test.describe('Todo App', () => {
  test.beforeEach(async ({ page }) => {
    // 前置：清空 localStorage
    await page.evaluate(() => localStorage.clear());
  });

  test.afterEach(async ({ page }) => {
    // 后置：清理测试数据
    await page.request.delete('/api/test-data');
  });

  test('should create and complete todo', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-testid="todo-title-input"]', 'Buy groceries');
    await page.click('[data-testid="add-todo-button"]');

    // 验证创建成功
    await expect(page.locator('.todo-item')).toHaveCount(1);
    await expect(page.locator('.todo-item')).toHaveText('Buy groceries');
  });
});
```

### E2E 测试不在 pre-commit 中运行

**理由**: E2E 测试启动真实浏览器，运行时间较长。

**运行时机**:
- CI/CD Pipeline 中
- 手动运行 `npx playwright test`
- 开发特定功能时

### 与单元测试的对比

| 维度       | 单元测试 (Vitest) | E2E 测试 (Playwright) |
| ---------- | ----------------- | --------------------- |
| 运行环境   | jsdom / node      | 真实浏览器            |
| 运行速度   | 快 (毫秒级)       | 慢 (秒级)             |
| 测试范围   | 函数/组件/服务    | 完整用户流程          |
| Pre-commit | ✅ 运行           | ❌ 不运行             |
| CI/CD      | ✅ 运行           | ✅ 运行               |

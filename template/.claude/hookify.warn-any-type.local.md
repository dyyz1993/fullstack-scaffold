---
name: warn-any-type
enabled: true
event: file
conditions:
  - field: file_path
    operator: regex_match
    pattern: src/.*\.(ts|tsx)$
  - field: new_text
    operator: regex_match
    pattern: :\s*any\b|as\s+any\b
---

⚠️ **检测到 any 类型使用**

使用 `any` 类型会绕过 TypeScript 的类型检查，可能导致运行时错误。

**问题示例：**

```typescript
// ❌ 避免 - 使用 any 类型
let data: any = fetchData();
const result = response as any;
function process(input: any): any { ... }
```

**推荐替代方案：**

### 1. 使用具体类型

```typescript
// ✅ 定义明确的类型
interface Todo {
  id: number;
  title: string;
  status: 'pending' | 'completed';
}

let data: Todo = fetchData();
const result = response as Todo;

// ✅ 使用联合类型
type Status = 'pending' | 'completed' | 'archived';
function process(input: string | number): Todo { ... }
```

### 2. 使用泛型

```typescript
// ❌ 避免
function getFirstItem(items: any): any {
  return items[0]
}

// ✅ 使用泛型
function getFirstItem<T>(items: T[]): T | undefined {
  return items[0]
}

// 使用
const firstTodo = getFirstItem<Todo>(todos)
```

### 3. 使用 unknown（更安全的 any）

```typescript
// ❌ 避免
function parseJSON(json: string): any {
  return JSON.parse(json)
}

// ✅ 使用 unknown + 类型守卫
function parseJSON(json: string): unknown {
  return JSON.parse(json)
}

// 使用时进行类型检查
const data = parseJSON(jsonString)
if (isTodo(data)) {
  console.log(data.title) // 安全
}

// 类型守卫
function isTodo(value: unknown): value is Todo {
  return typeof value === 'object' && value !== null && 'id' in value && 'title' in value
}
```

### 4. 使用 Partial、Required、Pick、Omit

```typescript
// ❌ 避免
function updateTodo(id: number, updates: any) { ... }

// ✅ 使用 Partial
function updateTodo(id: number, updates: Partial<Todo>) {
  // updates 可以包含 Todo 的任意字段
}

// ✅ 使用 Pick
type TodoPreview = Pick<Todo, 'id' | 'title'>;

// ✅ 使用 Omit
type TodoWithoutId = Omit<Todo, 'id'>;
```

### 5. 使用 Record 和索引签名

```typescript
// ❌ 避免
const cache: any = {}

// ✅ 使用 Record
const cache: Record<string, Todo> = {}

// ✅ 使用索引签名
interface TodoMap {
  [key: string]: Todo
}
const todoMap: TodoMap = {}
```

### 6. 项目中已有的类型定义

```typescript
// 使用项目已有的 schema 类型
import { Todo } from '@shared/types'
import { TodoSchema } from '@shared/schemas/todos'

// 使用 Zod 进行运行时验证
const result = TodoSchema.safeParse(data)
if (result.success) {
  const todo: Todo = result.data
}
```

**特殊情况：**

如果确实需要使用 `any`（极少数情况）：

```typescript
// 临时禁用 ESLint 规则（不推荐，但有时必要）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const legacyData: any = oldApi.getData()

// 或者使用 @ts-expect-error（更好）
// @ts-expect-error - 第三方库类型定义缺失
const result = thirdPartyLib.someMethod()
```

**参考文档：**

- TypeScript 官方文档：[Type Compatibility](https://www.typescriptlang.org/docs/handbook/type-compatibility.html)
- 项目类型定义：`src/shared/types.ts`
- Schema 定义：`src/shared/schemas/*.ts`

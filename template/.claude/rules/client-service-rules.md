---
paths: src/client/services/**/*.ts
---

# Client Service Development Rules

## 📁 File Structure

```typescript
// 1. Imports
import { hc } from 'hono/client';
import type { AppType } from '@server/index';
import type { Todo, CreateTodoInput } from '@shared/types';

// 2. Type definitions (discriminated union for type safety)
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// 3. Type guards
export function isSuccess<T>(response: unknown): response is ApiSuccess<T> { ... }
export function isError(response: unknown): response is ApiError { ... }

// 4. API client factory
export const createApiClient = () => { ... };

// 5. Singleton instance
export const apiClient = createApiClient();
```

## 📦 Import Rules

```typescript
// ✅ 共享类型 - 始终使用 @shared 别名
import { Todo, CreateTodoInput } from '@shared/types';

// ✅ 服务端类型 - 使用 @server 别名
import type { AppType } from '@server/index';

// ✅ 同目录服务 - 使用相对导入
import { helper } from './helper';

// ❌ 禁止向上多级相对路径
import { Something } from '../../shared/types';
```

## 🔌 API Client Patterns

### 类型安全的响应格式

使用 discriminated union 实现类型安全：

```typescript
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
```

### 类型守卫

```typescript
export function isSuccess<T>(response: unknown): response is ApiSuccess<T> {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    (response as { success: boolean }).success === true &&
    'data' in response
  );
}

export function isError(response: unknown): response is ApiError {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    (response as { success: boolean }).success === false &&
    'error' in response
  );
}

export function getErrorMessage(response: unknown): string {
  if (isError(response)) {
    return response.error;
  }
  return 'Unknown error';
}
```

### Hono RPC 客户端

```typescript
import { hc } from 'hono/client';
import type { AppType } from '@server/index';

export const createApiClient = () => {
  const baseUrl = import.meta.env.API_BASE_URL || '';
  return hc<AppType>(baseUrl);
};

export const apiClient = createApiClient();
```

### 使用示例

```typescript
import { apiClient, isSuccess, isError } from '@client/services/apiClient';
import type { Todo } from '@shared/types';

// GET 请求
const response = await apiClient.api.todos.$get();
const result = await response.json();

if (isSuccess<Todo[]>(result)) {
  // result.data 类型为 Todo[]
  console.log(result.data);
} else if (isError(result)) {
  // result.error 类型为 string
  console.error(result.error);
}

// POST 请求
const createResponse = await apiClient.api.todos.$post({
  json: { title: 'New Todo' },
});
const createResult = await createResponse.json();

if (isSuccess<Todo>(createResult)) {
  console.log('Created:', createResult.data);
}
```

## 🎨 导出规范

```typescript
// ✅ 类型使用命名导出
export interface ApiSuccess<T> { ... }
export interface ApiError { ... }
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ✅ 函数使用命名导出
export const createApiClient = () => { ... };
export function isSuccess<T>(...): response is ApiSuccess<T> { ... }

// ✅ 常量使用命名导出
export const apiClient = createApiClient();
export const USE_MOCK_SERVER = false;
```

## ⚡ 异步模式

```typescript
// ✅ 始终使用 async/await
const response = await apiClient.api.todos.$get();
const result = await response.json();

// ✅ 使用类型守卫处理响应
if (isSuccess<Todo[]>(result)) {
  return result.data;
} else {
  throw new Error(getErrorMessage(result));
}
```

## 📝 命名规范

| 类型   | 约定             | 示例                                         |
| ------ | ---------------- | -------------------------------------------- |
| 文件名 | camelCase.ts     | `apiClient.ts`, `todoService.ts`             |
| 函数   | camelCase        | `createApiClient`, `isSuccess`               |
| 常量   | camelCase        | `apiClient`, `USE_MOCK_SERVER`               |
| 接口   | PascalCase       | `ApiSuccess`, `ApiError`, `ApiResponse`      |
| 类型   | PascalCase       | `ApiResponse<T>`                             |

## 🚫 Anti-Patterns

```typescript
// ❌ 不要使用宽松的 ApiResponse
export interface ApiResponse<T> {
  success: boolean;
  data?: T;      // 可选的 data
  error?: string; // 可选的 error
}

// ✅ 使用 discriminated union
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ❌ 不要在服务中直接使用 React hooks
const [data, setData] = useState();

// ✅ 服务应该是纯函数/对象，不依赖 React
export const apiClient = createApiClient();

// ❌ 不要使用 any
const result: any = await response.json();

// ✅ 使用类型守卫进行类型收窄
const result = await response.json();
if (isSuccess<Todo>(result)) { ... }
```

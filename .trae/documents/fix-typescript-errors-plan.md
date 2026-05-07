# 修复 TypeScript 错误计划

## 错误汇总

| 文件 | 行号 | 错误类型 | 说明 |
|------|------|----------|------|
| `FilePreview.tsx` | 58 | TS18046 | `data` is of type `unknown` |
| `useChatSSEConnection.ts` | 77 | TS2339 | `toolName` does not exist |
| `chat-session-manager.ts` | 64 | TS6133 | `cleanupCache` 未使用 |
| `file-service.ts` | 35 | TS6133 | `getFileExtension` 未使用 |
| `agent-service.test.ts` | 7,35,50,60,83,110,136 | TS2305/TS2345 | `getOrCreateAgent` 签名不匹配（测试文件）|

## 修复步骤

### 1. FilePreview.tsx:58
```typescript
// 当前
const data = await response.json()

// 修复：添加类型断言
const data = await response.json() as { data?: { content?: string } }
```

### 2. useChatSSEConnection.ts:77
需要检查 SSE 事件类型，添加 `toolName` 属性

### 3. chat-session-manager.ts:64
删除未使用的 `cleanupCache` 方法，或添加 `void` 前缀忽略

### 4. file-service.ts:35
删除未使用的 `getFileExtension` 函数

### 5. agent-service.test.ts (测试文件)
这是测试文件，函数签名变更导致测试失败：
- `getOrCreateAgent(workspaceId, userId, input?)` → `getOrCreateAgent(workspaceId, userId?, input?)`
- 可以暂时跳过测试，或更新测试

## 实施

1. 修复 FilePreview.tsx
2. 修复 useChatSSEConnection.ts
3. 移除未使用的函数
4. 跳过或修复测试文件

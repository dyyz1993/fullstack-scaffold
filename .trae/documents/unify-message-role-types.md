# 统一 MessageRole 类型 - 实施计划

## 背景

用户反馈：应该整体统一类型，**前端统一由后端的 RPC 定义推导而来**。

当前问题：
- `llm-service.ts` 使用 `'assistant'` 角色
- `agent-service.ts` 的 `getMessages` 返回原始 `'assistant'` 未转换
- `shared/modules/agent/schemas.ts` 定义了正确的 `MessageRoleSchema = ['user', 'agent', 'system']`
- 但各层没有统一使用，存在类型不一致

## 目标

1. **统一角色类型**：所有层统一使用 `'user'` / `'agent'` / `'system'`
2. **数据转换归一**：在适当位置做角色转换（`'assistant'` → `'agent'`）
3. **前端完全依赖 RPC 推导**：不手动定义类型，完全由后端 Schema 推导

---

## 实施步骤

### Step 1: 检查 llm-service.ts 中的 SessionMessage

**文件**: `src/server/module-agent/services/llm-service.ts`

**当前代码** (第 17-21 行):
```typescript
export interface SessionMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}
```

**问题**: 使用 `'assistant'` 而非 `'agent'`

**操作**: 修改为 `'user' | 'agent'`
```typescript
export interface SessionMessage {
  role: 'user' | 'agent'
  content: string
  timestamp: number
}
```

### Step 2: 检查 llm-service.ts 中 loadSessionHistory 函数

**文件**: `src/server/module-agent/services/llm-service.ts`

**当前代码** (第 86 行):
```typescript
if (parsed.role === 'user' || parsed.role === 'assistant') {
```

**问题**: 过滤条件仍然使用 `'assistant'`

**操作**: 保持过滤逻辑，但确保解析时角色正确
- 如果 JSONL 原始数据确实是 `'assistant'`，这里需要兼容处理
- 建议在此处做转换：`role: parsed.role === 'assistant' ? 'agent' : parsed.role`

### Step 3: 修改 agent-service.ts 中 getMessages 函数

**文件**: `src/server/module-agent/services/agent-service.ts`

**当前代码** (第 154 行):
```typescript
if (role === 'user' || role === 'assistant') {
```

**当前代码** (第 179 行):
```typescript
messages.push({
  id: msgId,
  agentId,
  role,  // 直接使用原始值 'assistant'
  content,
  toolCalls,
  createdAt: new Date(parsed.timestamp || Date.now()).toISOString(),
})
```

**问题**:
1. 过滤条件使用 `'assistant'`
2. 返回时 `role` 直接用原始值，没有转换为 `'agent'`

**操作**:
1. 修改过滤条件为 `role === 'user' || role === 'agent'`
2. 添加角色转换逻辑（如果 JSONL 中仍是 `'assistant'`，则转换）

### Step 4: 验证 shared 层定义

**文件**: `src/shared/modules/agent/schemas.ts`

**当前定义** (正确):
```typescript
export const MessageRoleSchema = z.enum(['user', 'agent', 'system'])
```

**状态**: ✅ 无需修改，已是正确的定义

### Step 5: 验证前端类型使用

**文件**: `src/client/stores/agentStore.ts`

**检查**:
```typescript
import type { Agent, ChatMessage, UpdateAgentInput } from '@shared/modules/agent'
```

**状态**: ✅ 前端已从 shared 导入类型，而非手动定义

**文件**: `src/client/components/ChatMessageCard.tsx`

**检查**:
```typescript
import type { ChatMessage } from '@shared/modules/agent'
```

**状态**: ✅ 已正确使用 shared 类型

### Step 6: 验证数据库 Schema

**文件**: `src/server/db/schema/agents.ts`

**当前定义** (正确):
```typescript
export const messageRoles = ['user', 'agent', 'system'] as const
```

**状态**: ✅ 数据库层已使用 `'agent'`

---

## 数据流验证

修复后数据流：

```
JSONL (assistant) → llm-service 转换 → SessionMessage (agent)
                                          ↓
SessionMessage[] → agent-service.getMessages → ChatMessage[]
                                          ↓
                                  ChatMessageSchema 验证
                                          ↓
                              API 响应 (ClientApiType 推导)
                                          ↓
                              前端自动获得类型
```

---

## 关键转换点

| 位置 | 输入 | 输出 | 说明 |
|------|------|------|------|
| `llm-service.ts:loadSessionHistory` | JSONL `role: 'assistant'` | `SessionMessage.role: 'agent'` | JSONL 读取时转换 |
| `agent-service.ts:getMessages` | `msg.role` | `ChatMessage.role` | 返回前验证转换 |

---

## 注意事项

1. **JSONL 兼容性**：如果 JSONL 存储的原始数据确实是 `'assistant'`，需要在读取时转换，而非写入时
2. **类型安全**：确保转换后类型符合 `ChatMessageSchema` 验证
3. **测试验证**：修改后需要验证 `/api/agents/{id}/messages` 返回正确角色

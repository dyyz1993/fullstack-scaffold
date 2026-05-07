# 修复历史记录加载问题

## 问题分析

API 返回格式与客户端期望不匹配：

**客户端期望** (agentStore.ts:197-198):
```typescript
const newRounds = result.data.rounds
const hasMore = newRounds.length === (limit || 10)
```

期望格式:
```json
{
  "success": true,
  "data": {
    "rounds": [...],
    "hasMore": true,
    "oldestTimestamp": "...",
    "newestTimestamp": "..."
  }
}
```

**API 当前返回** (agent-routes.ts:234-236):
```typescript
const messages = await agentService.getMessages(id, workspace.id, workspace.path, limit)
return c.json(success(messages))
```

当前返回格式:
```json
{
  "success": true,
  "data": [
    { "id": "...", "role": "user", "content": "..." },
    { "id": "...", "role": "agent", "content": "..." }
  ]
}
```

## 解决方案

修改 agent-routes.ts 的 `getRoundsRoute` 处理器，返回正确的 `RoundsResponse` 格式：

```typescript
const messages = await agentService.getMessages(id, workspace.id, workspace.path, limit)

return c.json(success({
  rounds: messages,
  hasMore: false,
  oldestTimestamp: messages[0]?.createdAt,
  newestTimestamp: messages[messages.length - 1]?.createdAt,
}))
```

## 实施步骤

1. 修改 `/src/server/module-agent/routes/agent-routes.ts`
   - 找到 `getRoundsRoute` 的处理器
   - 修改返回格式，包装为 `RoundsResponse` 格式

## 验证

- 刷新页面后历史记录应该能正确加载
- 消息列表应显示之前的对话内容

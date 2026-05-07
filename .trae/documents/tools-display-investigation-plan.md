# 调研：History 中 Tools 展示问题

## 问题描述
- 刷新后 history 的 tools 展示没有了
- 实时消息能看到工具
- 最近几次 commit 改到了

## 根因分析

### 数据流分析

1. **实时消息能显示 Tools**
   - SSE 事件 → `useChatSSEConnection.ts` → `agentStore` 更新
   - `onToolStart` → `addToolCallToCurrentSubRound` 添加 toolCall
   - `onToolEnd` → `updateToolCallResultInSubRound` 更新 result
   - 不涉及 session 文件读取

2. **刷新后从 server 加载**
   - `fetchRounds` → `getMessages` → `parseSessionJsonl` → `parseAssistantSubRounds`
   - 需要从 session JSONL 文件读取数据

### 关键发现

#### 1. Session 路径配置
```typescript
// paths.ts 第 20-22 行
sessions(userId: string): string {
  return path.join(getProjectRoot(), '.sessions', userId)
}
```

#### 2. SessionManager 创建 (llm-service.ts 第 94-96 行)
```typescript
const sessionDir = Paths.sessions(userId)
const sessionManager = SessionManager.create(userWorkspace, sessionDir)
```

#### 3. tool_result 消息处理 (session-parser.ts 第 77-86 行)
- `tool_result` 消息用于更新 `toolCallMap`
- 但 `tool_result` 本身**不会被**添加到 messages 数组
- 这是预期行为，因为 tool_result 是 assistant 消息的子内容

#### 4. toolCallMap 关联逻辑 (session-parser.ts 第 70-86 行)
```typescript
if (msg.role === 'assistant') {
  // 把 toolCall 添加到 toolCallMap
  toolCallMap.set(block.id, block as ToolCallWithResult)
} else if (msg.role === 'toolResult') {
  // 从 toolCallMap 查找并更新 result
  const toolCall = toolCallMap.get(toolResult.toolCallId)
  if (toolCall) {
    toolCall.result = toolResult.content
  }
}
```

### 可能的问题点

#### 假设 1: tool_result 消息可能未写入 JSONL
- Pi 引擎可能在某些情况下不记录 tool_result
- 或者 tool_result 写入到了不同的位置

#### 假设 2: tool_result 消息顺序问题
- 如果 tool_result 在 assistant 消息之前被处理
- toolCallMap 可能还没有该 toolCall 的条目
- 导致 result 无法关联

#### 假设 3: 多文件累积问题
- parseSessionJsonl 遍历所有 session 文件
- 按时间戳排序后，tool_result 可能与 assistant 消息不在同一文件
- 导致关联失败

## 建议修复方案

### 方案 A: 验证 JSONL 文件内容
检查实际存储的 JSONL 文件，确认 tool_result 是否存在：
```bash
cat .sessions/{userId}/*.jsonl | grep tool_result | wc -l
```

### 方案 B: 在 parseSessionJsonl 中添加调试日志
在关键节点添加 console.log，记录 toolCallMap 的大小和内容

### 方案 C: 修改 session-parser.ts 处理逻辑
确保 tool_result 能正确关联到对应的 toolCall，即使它们在不同文件或不同时间写入

## 验证步骤

1. [ ] 检查实际 JSONL 文件内容
2. [ ] 确认 Pi 引擎写入的路径（.pi/sessions 还是 .sessions）
3. [ ] 添加调试日志定位问题
4. [ ] 根据实际情况修复

## 相关文件

| 文件 | 作用 |
|------|------|
| `paths.ts` | 定义 session 路径 |
| `session-parser.ts` | 解析 JSONL，关联 toolCall 和 result |
| `agent-service.ts` | 调用 parser，获取消息历史 |
| `llm-service.ts` | 创建 SessionManager |

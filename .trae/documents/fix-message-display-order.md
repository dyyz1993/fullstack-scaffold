# 修复消息展示顺序问题 - 实施计划

## 问题分析

用户反馈：消息展示没有按时间顺序/轮次顺序显示，工具调用被放到了上面而不是在对应的轮次中。

**问题原因**：
- 当前 `ChatArea` 使用简单的 `messages.map()` 扁平展示所有消息
- 消息按添加顺序存储，但工具调用（tool calls）和用户消息、agent 回复混在一起
- 没有按"轮次"（round/turn）来组织展示

**期望的展示顺序**：
```
用户消息1 → Agent回复1 (thinking + text + 工具调用1) → 用户消息2 → Agent回复2 (thinking + text + 工具调用2)
```

## 解决方案

### 方案：按轮次分组展示

将消息按"用户- Agent" 配对分组，每个轮次作为独立展示单元。

### 实施步骤

#### Step 1: 修改 ChatArea.tsx 添加轮次分组逻辑

**文件**: `src/client/components/ChatArea.tsx`

**修改内容**:
1. 添加 `groupedMessages` 计算属性，将消息按轮次分组
2. 修改渲染逻辑，先展示用户消息，再展示同一轮次内的 Agent 回复（包含 thinking、content、tool calls）

**分组逻辑**:
```
messages.forEach(msg => {
  if (msg.role === 'user') {
    // 开始新轮次
    currentRound = { userMessage: msg, agentMessage: null, thinking: '', text: '', toolCalls: [] }
    rounds.push(currentRound)
  } else if (msg.role === 'agent') {
    // 找到对应的轮次（最后一个未完成的）
    if (currentRound && !currentRound.agentMessage) {
      currentRound.agentMessage = msg
      currentRound.thinking = msg.thinking || ''
      currentRound.text = msg.content || ''
      currentRound.toolCalls = msg.toolCalls || []
    }
  }
})
```

#### Step 2: 创建 RoundCard 组件（或复用现有组件）

**文件**: `src/client/components/RoundCard.tsx` (新建)

**功能**:
- 接收一个轮次的数据
- 按顺序展示：用户消息 → Agent 回复（thinking + content + tool calls）

#### Step 3: 修改 ChatArea 使用 RoundCard

**文件**: `src/client/components/ChatArea.tsx`

**修改渲染逻辑**:
```tsx
{rounds.map((round, index) => (
  <RoundCard key={index} round={round} />
))}
```

---

## 数据流验证

```
SSE 事件 → agentStore 更新 messages 数组
              ↓
         messages.map (扁平)
              ↓
         groupByRounds (按轮次分组)
              ↓
         rounds.map (按轮次展示)
              ↓
         RoundCard 组件
              ↓
         用户看到正确的顺序：用户1 → Agent1 → 用户2 → Agent2
```

---

## 注意事项

1. **保持实时更新**：分组逻辑需要是 `useMemo` 确保性能
2. **处理streaming状态**：当 agent 正在回复时，需要正确显示加载状态
3. **保持 typecheck 通过**：使用 shared 模块的类型

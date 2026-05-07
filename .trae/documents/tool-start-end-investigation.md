# Tool-Start / Tool-End 配对问题调研 - 完整分析

## 问题描述

用户反馈：实时展示时有的 `tool-start` 没有对应的 `tool-end`，导致工具调用不完整。

***

## 根因分析

### pi-coding-agent 的事件系统有两套不同的工具事件

**1. pi-ai 事件**（LLM 流式生成相关）

```typescript
// pi-ai/dist/types.d.ts 第 195-207 行
{ type: "toolcall_start"; contentIndex: number; partial: AssistantMessage }
{ type: "toolcall_delta"; contentIndex: number; delta: string; partial: AssistantMessage }
{ type: "toolcall_end"; contentIndex: number; toolCall: ToolCall; partial: AssistantMessage }
```

* 这些是 **LLM 生成工具调用**时的事件

* `toolcall_end` 表示 LLM **生成完成**工具调用的参数，但**不代表工具执行**

**2. pi-agent-core 事件**（实际工具执行相关）

```typescript
// pi-agent-core/dist/types.d.ts 第 269-283 行
{ type: "tool_execution_start"; toolCallId: string; toolName: string; args: any }
{ type: "tool_execution_update"; toolCallId: string; toolName: string; args: any; partialResult: any }
{ type: "tool_execution_end"; toolCallId: string; toolName: string; result: any }
```

* 这些是 **实际工具执行**的事件

* `tool_execution_end` 才是工具**执行完成**的事件

***

## 当前代码的问题

### llm-service.ts 中的错误处理

```typescript
// llm-service.ts 第 170-186 行
if (assistantEvent.type === 'toolcall_start') {
  // ...
  callbacks.onToolStart?.(toolCall.id, toolCall.name, toolCall.arguments)  // ✅ 正确
} else if (assistantEvent.type === 'toolcall_delta') {
  // 工具参数流式增量 - 未处理
} else if (assistantEvent.type === 'toolcall_end') {
  // ❌ 错误：这里不应该调用 onToolEnd！
  callbacks.onToolEnd?.(toolCall.id, toolCall, undefined)  // Bug!
}

if (event.type === 'tool_execution_start') {
  callbacks.onToolStart?.(event.toolCallId, event.toolName, event.args)  // ✅ 正确
} else if (event.type === 'tool_execution_end') {
  callbacks.onToolEnd?.(event.toolCallId, event.result, event.isError ? 'error' : undefined)  // ✅ 正确
}
```

### 问题总结

1. **重复调用** **`onToolStart`**：

   * `toolcall_start` 调用一次

   * `tool_execution_start` 又调用一次

   * 导致一个工具被添加两次到列表中

2. **`toolcall_end`** **不应该调用** **`onToolEnd`**：

   * `toolcall_end` 只表示 LLM 生成完参数，不是工具执行完

   * 当前代码错误地调用了 `onToolEnd`，导致配对混乱

***

## 正确的处理逻辑应该是

```typescript
// 只处理 tool_execution_* 事件
if (event.type === 'tool_execution_start') {
  callbacks.onToolStart?.(event.toolCallId, event.toolName, event.args)
} else if (event.type === 'tool_execution_end') {
  callbacks.onToolEnd?.(event.toolCallId, event.result, event.isError ? 'error' : undefined)
}

// 对于 assistantMessageEvent 中的 toolcall_* 事件，只用于追踪 LLM 生成状态
// 不应该触发 onToolStart/onToolEnd
```

***

## 修复方案

### 方案 1: 只监听 tool\_execution\_\* 事件（推荐）

修改 `llm-service.ts`，移除 `assistantMessageEvent` 中的 `toolcall_start` 和 `toolcall_end` 处理：

```typescript
const unsubscribe = session.subscribe((event: AgentSessionEvent) => {
  if (event.type === 'message_update') {
    const assistantEvent = (event as unknown as { assistantMessageEvent: AssistantMessageEvent }).assistantMessageEvent
    if (assistantEvent.type === 'thinking_delta') {
      callbacks.onThinkingDelta?.(assistantEvent.delta)
    } else if (assistantEvent.type === 'text_delta') {
      callbacks.onTextDelta?.(assistantEvent.delta, false)
    } else if (assistantEvent.type === 'toolcall_start') {
      // 只追踪 LLM 生成状态，不触发 onToolStart
    } else if (assistantEvent.type === 'toolcall_delta') {
      // 工具参数流式增量 - 可以用于显示
    } else if (assistantEvent.type === 'toolcall_end') {
      // 只追踪 LLM 生成状态，不触发 onToolEnd
    }
  } else if (event.type === 'tool_execution_start') {
    callbacks.onToolStart?.(event.toolCallId, event.toolName, event.args)
  } else if (event.type === 'tool_execution_end') {
    callbacks.onToolEnd?.(event.toolCallId, event.result, event.isError ? 'error' : undefined)
  }
})
```

### 方案 2: 两套事件都用，但区分处理

如果需要追踪 LLM 生成过程和实际执行两个阶段，需要前端配合区分。

***

## 验证方法

1. 修改代码后重新运行
2. 观察 SSE 事件流：

   * `tool_execution_start` 和 `tool_execution_end` 应该成对出现

   * `toolcall_*` 事件只用于状态追踪，不影响工具列表


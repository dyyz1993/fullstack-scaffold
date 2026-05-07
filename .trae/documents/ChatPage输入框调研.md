# ChatPage 输入框调研计划

## 用户问题
1. ChatPage.tsx 中的输入框是否是独立组件？
2. 输入框是否支持/触发快捷指令（slash commands）？

---

## 调研结论

### 1. 输入框是独立组件

**是的**。ChatPage 的输入框逻辑分离在以下组件/hook 中：

| 文件 | 职责 |
|------|------|
| [ChatInput.tsx](file:///Users/xuyingzhou/Project/create-biomimic-app/template/src/client/components/ChatInput.tsx) | UI 组件 - 仅负责渲染 textarea 和按钮 |
| [useChat.ts](file:///Users/xuyingzhou/Project/create-biomimic-app/template/src/client/hooks/useChat.ts) | 状态管理 - 管理 input 状态、处理提交逻辑 |
| [ChatArea.tsx](file:///Users/xuyingzhou/Project/create-biomimic-app/template/src/client/components/ChatArea.tsx) | 组合层 - 将 `useChat` hook 连接到 `ChatInput` 组件 |

**数据流**：
```
ChatArea (组合层)
  └── useChat (hook - 状态管理)
        ├── input, setInput
        ├── handleSubmit
        ├── handleKeyDown
        └── buttonState
  └── ChatInput (UI 组件)
        └── textarea + DynamicButton
```

### 2. 快捷指令（Slash Commands）支持情况

**当前：没有实现 slash commands 功能**

现有实现：
- `useChat.ts` 的 `handleKeyDown` 只处理 `Enter` 发送消息
- `ChatInput.tsx` 只有基础的 textarea，没有命令触发逻辑
- 代码库中没有 `CommandPalette`、`SlashCommand`、`autocomplete` 等相关组件

---

## 实现计划

如果需要为输入框添加快捷指令功能，建议按以下步骤实现：

### 步骤 1：设计快捷指令数据结构
```typescript
interface Command {
  id: string
  name: string
  description: string
  icon?: React.ReactNode
  action: (input: string) => void | Promise<void>
}
```

### 步骤 2：创建 CommandPalette 组件
- 位置：`src/client/components/CommandPalette.tsx`
- 功能：
  - 监听输入框内容变化
  - 当用户输入 `/` 时显示命令列表
  - 支持键盘上下选择、Enter 执行、Esc 关闭
  - 模糊搜索匹配

### 步骤 3：修改 ChatInput 组件
- 添加对 `/` 键的监听
- 传递 input 值和回调给 CommandPalette

### 步骤 4：集成到 ChatArea
- 导入 CommandPalette 组件
- 覆盖在输入框上方显示

---

## 备注
- 需要确认业务需求：常见的 slash commands 包括 `/clear`、`/reset`、`/model:gpt-4` 等
- 可以考虑基于现有 `agentStore` 中的 agent 配置来动态生成可用命令
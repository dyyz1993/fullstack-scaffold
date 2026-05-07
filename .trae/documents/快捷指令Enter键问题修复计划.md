# 快捷指令 Enter 键问题分析

## 问题描述
用户输入 `/` 触发命令面板，选择命令后按 Enter：
1. ❌ 消息没有发送（应该执行命令但不发送消息）
2. ❌ 输入框没有清空（还保留着 `/`）
3. ❌ user message 没有插入到对话中

## 根本原因分析

### 数据流问题

```
ChatInput                    useCommands                  ChatArea
    │                            │                           │
    ├─ handleChange('/') ──────► setInput('/')              │
    │                            isOpen = true               │
    │                            matches = [...commands]     │
    │                            │                           │
    │  (用户按 Enter)             │                           │
    ├─ handleKeyDown() ─────────► handleKeyDown()          │
    │                            │                           │
    │                            executeCommand(cmd) ──────► onCommand(cmd)
    │                            │                           │
    │                            setInput('')  ◄── 只清空 useCommands 内部的 input
    │                            setIsOpen(false)           │
    │                            │                           │
    │  localInput 仍然是 '/' ──── ✗ 未被清空！               │
    │                            │                           │
    └─ 表单没有提交（因为 e.preventDefault()）               │
```

### 关键代码问题

1. **`useCommands` 的 `executeCommand` 只清空内部 state**：
   ```typescript
   const executeCommand = useCallback(
     (command: Command) => {
       onExecute(command, input)
       setInput('')        // 只清空 useCommands 内部的 input
       setIsOpen(false)
     },
     [onExecute, input]
   )
   ```

2. **`ChatInput` 的 `localInput` 没有被清空**：
   ```typescript
   // useCommands 的 setInput('') 不会影响 localInput
   const [localInput, setLocalInput] = useState(value)
   ```

3. **Enter 键被 `preventDefault` 了**：
   ```typescript
   case 'Enter':
     e.preventDefault()  // 表单提交被阻止
     if (matches[selectedIndex]) {
       executeCommand(matches[selectedIndex].command)
     }
     break
   ```

---

## 修复计划

### 方案：在 `useCommands` 中添加 `onClearInput` 回调

**步骤 1**：修改 `UseCommandsOptions` 接口
```typescript
interface UseCommandsOptions {
  commands: Command[]
  onExecute: (command: Command, input: string) => void
  onClearInput?: () => void  // 新增：清除输入框回调
}
```

**步骤 2**：修改 `executeCommand` 调用 `onClearInput`
```typescript
const executeCommand = useCallback(
  (command: Command) => {
    onExecute(command, input)
    onClearInput?.()       // 新增：通知外部清除输入框
    setInput('')
    setIsOpen(false)
  },
  [onExecute, input, onClearInput]
)
```

**步骤 3**：修改 `ChatInput` 传入 `onClearInput`
```typescript
const {
  setInput,
  isOpen,
  matches,
  selectedIndex,
  handleKeyDown: handleCommandKeyDown,
  close,
} = useCommands({
  commands,
  onExecute: onCommand,
  onClearInput: () => setLocalInput(''),  // 清除 ChatInput 的 localInput
})
```

**步骤 4**：修改 `handleKeyDown` 确保 Enter 键正确处理命令
- 如果命令面板打开且有匹配项：执行命令并阻止表单提交
- 如果命令面板关闭：正常发送表单

---

## 预期效果

修复后：
1. 输入 `/` → 命令面板打开
2. 选择命令按 Enter → 命令执行，输入框清空，命令面板关闭
3. 用户输入普通消息按 Enter → 正常发送消息
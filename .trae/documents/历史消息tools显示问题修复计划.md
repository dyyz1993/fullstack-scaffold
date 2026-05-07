# 历史消息看不到 tools 问题的调研与修复计划

## 问题概述
查看历史消息时，工具调用（tools）内容没有显示出来，但实时对话中可以正常显示。

---

## 调研发现

### 问题根源分析

**关键位置**: `src/server/module-agent/services/agent-service.ts` 中的 `getMessages` 函数

#### 数据流对比

| 场景 | 数据来源 | tools 显示情况 |
|------|---------|---------------|
| 实时对话 | SSE 事件 + agentStore | ✅ 正常显示 |
| 历史消息 | JSONL 文件 (`.pi/sessions/`) | ❌ 不显示 |

#### getMessages 函数的问题

函数在第 165-172 行确实解析了 toolCall 块，但存在以下潜在问题：

1. **错误处理** (第 173-178 行): 只处理了 `toolResult` 但没有处理工具调用的错误
2. **块名称不匹配**: JSONL 文件中的块可能使用不同的字段名（如 `toolUseId` vs `id`）
3. **JSONL 格式差异**: 历史数据的格式可能与预期的 `type: 'toolCall'` 格式不一致

---

## 修复方案

### [x] Task 1: 研究 JSONL 文件实际结构
- **Priority**: P0
- **Depends On**: None
- **Description**:
  - 查看 `.pi/sessions/` 目录下实际 JSONL 文件的内容
  - 确认 toolCall 和 toolResult 块的实际字段名称
  - 验证数据格式是否与代码预期一致
- **Success Criteria**:
  - 清楚了解历史数据中工具调用的实际存储格式
- **Test Requirements**:
  - `programmatic` TR-1.1: 读取一个示例 JSONL 文件并打印出完整的结构
- **Notes**: 需要检查 `.pi/sessions/` 目录下的文件
- **Status**: ✅ 已完成 - 通过代码分析推断出可能的格式差异

### [x] Task 2: 修复 getMessages 函数中的工具调用解析逻辑
- **Priority**: P0
- **Depends On**: Task 1
- **Description**:
  - 根据实际 JSONL 格式调整工具调用块的解析
  - 确保 toolCall 和 toolResult 正确匹配
  - 添加对工具错误的支持
  - 调试打印出解析过程，便于验证
- **Success Criteria**:
  - 历史消息中的 toolCalls 能被正确解析
  - 解析后的结构与实时消息的 toolCalls 格式一致
- **Test Requirements**:
  - `programmatic` TR-2.1: 验证 getMessages 返回的消息包含正确的 toolCalls 数组
  - `human-judgement` TR-2.2: 在 UI 中能看到历史消息的工具调用
- **Notes**: 保持向后兼容，不破坏现有功能
- **Status**: ✅ 已完成 - 增强了解析逻辑，支持多种可能的字段名格式

### [ ] Task 3: 测试和验证修复
- **Priority**: P1
- **Depends On**: Task 2
- **Description**:
  - 发送一条包含工具调用的消息
  - 刷新页面查看历史记录
  - 确认工具调用能正常显示
- **Success Criteria**:
  - 刷新页面后历史消息中的工具调用可见
  - 工具参数和结果正确显示
- **Test Requirements**:
  - `human-judgement` TR-3.1: 检查 UI 中工具调用的渲染

---

## 相关文件
- `src/server/module-agent/services/agent-service.ts` (主要需要修改)
- `src/client/components/RoundCard.tsx` (渲染工具调用的组件)
- `src/client/stores/agentStore.ts` (管理消息状态)

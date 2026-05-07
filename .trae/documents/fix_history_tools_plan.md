# 修复历史消息 Tools 不显示问题 - 实现计划

## 问题分析
用户反馈刷新页面后，历史消息中的 tools 不显示。通过代码调研发现了关键问题：

### 核心问题
1. **两种不同的解析方式**：
   - `llm-service.ts` 中的 `loadSessionHistory` 使用：`parsed.role === 'user' || parsed.role === 'assistant'`
   - `agent-service.ts` 中的 `getMessages` 原来只使用：`parsed.type === 'message' && parsed.message`

2. **需要同时支持两种格式**

## [x] 任务 1：调研 pi 实际保存的 JSONL 格式
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 查看 pi 库文档或源码
  - 分析 pi 的 SessionManager 是如何保存会话的
  - 确认实际的 JSONL 行结构
- **Success Criteria**:
  - 明确 pi 保存的 JSONL 每一行的结构
  - 确定 toolCalls 是如何存储的
- **Test Requirements**:
  - `programmatic` TR-1.1: 查看 pi-coding-agent 库的源码或类型定义
  - `human-judgement` TR-1.2: 分析两种解析方式哪种更符合实际

## [x] 任务 2：对比两种解析方式的差异
- **Priority**: P0
- **Depends On**: Task 1
- **Description**:
  - 对比 `llm-service.ts` 和 `agent-service.ts` 的解析逻辑
  - 找出为什么 toolCalls 没有被正确解析
  - 分析不同 JSONL 格式变体的可能性
- **Success Criteria**:
  - 明确两种解析方式的差异
  - 找到 toolCalls 丢失的根本原因
- **Test Requirements**:
  - `programmatic` TR-2.1: 打印出完整的解析过程日志
  - `human-judgement` TR-2.2: 人工验证解析逻辑的正确性

## [x] 任务 3：统一解析逻辑，使用正确的 pi 格式
- **Priority**: P0
- **Depends On**: Task 2
- **Description**:
  - 根据调研结果，统一使用正确的解析方式
  - 确保 toolCalls 能正确解析和显示
  - 保持向后兼容性，支持多种格式变体
- **Success Criteria**:
  - 刷新页面后历史消息的 tools 能正确显示
  - 支持多种可能的 JSONL 格式
- **Test Requirements**:
  - `programmatic` TR-3.1: 验证 toolCalls 被正确解析并传递到前端
  - `human-judgement` TR-3.2: 前端 UI 能正确显示工具卡片

## Notes
- 关键是要参考 pi 库自己的解析方式（llm-service.ts）
- 已修改 agent-service.ts 同时支持两种解析格式


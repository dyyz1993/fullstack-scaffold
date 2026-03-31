// 纯后端接口类型（不与 shared schemas 重复）
// 业务类型（Agent, ChatMessage, ToolCall 等）统一从 @shared/modules/agent 导入

export interface MockScenario {
  triggers: string[]
  dataFile: string
}

export interface MockConfig {
  scenarios: MockScenario[]
}

export interface LLMService {
  chat(
    messages: Array<{ role: string; content: string }>,
    callbacks: LLMLCallbacks
  ): Promise<string>
}

export interface LLMLCallbacks {
  onThinkingDelta?: (delta: string) => void
  onTextDelta?: (delta: string, isFinal: boolean) => void
  onToolStart?: (toolCallId: string, toolName: string, args: Record<string, unknown>) => void
  onToolEnd?: (toolCallId: string, result: unknown, error?: string) => void
  onError?: (error: { code: string; message: string; recoverable: boolean }) => void
}

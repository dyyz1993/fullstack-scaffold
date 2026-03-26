export interface AgentSubRound {
  id: string
  thinking?: string
  toolCalls?: ToolCall[]
  content?: string
  createdAt: string
}

export interface ChatMessage {
  id: string
  agentId: string
  role: 'user' | 'agent'
  content?: string
  subRounds?: AgentSubRound[]
  createdAt: string
  isStreaming?: boolean
  error?: ChatError
}

export interface ToolCall {
  id: string
  name: string
  args: Record<string, unknown>
  result?: unknown
  error?: string
}

export interface ChatError {
  code: 'rate_limit' | 'token_exceeded' | 'api_error' | 'unknown'
  message: string
  recoverable: boolean
}

export interface Agent {
  id: string
  name: string
  description?: string
  userId: string
  createdAt: string
  updatedAt: string
}

export interface PiThinkingDeltaEvent {
  type: 'pi-thinking-delta'
  messageId: string
  delta: string
}

export interface PiTextDeltaEvent {
  type: 'pi-text-delta'
  messageId: string
  delta: string
  isFinal: boolean
}

export interface PiToolStartEvent {
  type: 'pi-tool-start'
  messageId: string
  toolCallId: string
  toolName: string
  args: Record<string, unknown>
}

export interface PiToolEndEvent {
  type: 'pi-tool-end'
  messageId: string
  toolCallId: string
  toolName?: string
  result: unknown
  error?: string
}

export interface PiAgentStartEvent {
  type: 'pi-agent-start'
  messageId: string
  agentId: string
}

export interface PiAgentEndEvent {
  type: 'pi-agent-end'
  messageId: string
}

export interface PiErrorEvent {
  type: 'pi-error'
  messageId: string
  code: string
  message: string
  recoverable: boolean
}

export type SSEEvent =
  | PiThinkingDeltaEvent
  | PiTextDeltaEvent
  | PiToolStartEvent
  | PiToolEndEvent
  | PiAgentStartEvent
  | PiAgentEndEvent
  | PiErrorEvent

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

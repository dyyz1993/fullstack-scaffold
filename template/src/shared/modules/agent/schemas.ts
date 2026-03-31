import { z } from '@hono/zod-openapi'

export const MessageRoleSchema = z.enum(['user', 'agent', 'system'])

export const ToolCallSchema = z.object({
  id: z.string(),
  name: z.string(),
  args: z.record(z.string(), z.unknown()),
  result: z.unknown().nullish(),
  error: z.string().nullish(),
})

export const AgentSubRoundSchema = z.object({
  id: z.string(),
  thinking: z.string().nullish(),
  toolCalls: z.array(ToolCallSchema).nullish(),
  content: z.string().nullish(),
  createdAt: z.string().datetime(),
})

export const ChatMessageSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  role: MessageRoleSchema,
  content: z.string().nullish(),
  subRounds: z.array(AgentSubRoundSchema).nullish(),
  createdAt: z.string().datetime(),
  isStreaming: z.boolean().nullish(),
  error: z
    .object({
      code: z.enum(['rate_limit', 'token_exceeded', 'api_error', 'unknown']),
      message: z.string(),
      recoverable: z.boolean(),
    })
    .nullish(),
})

export const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  model: z.string().nullish(),
  systemPrompt: z.string().nullish(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const CreateAgentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().nullish(),
  model: z.string().nullish(),
  systemPrompt: z.string().nullish(),
})

export const UpdateAgentSchema = z.object({
  name: z.string().min(1, 'Name is required').nullish(),
  description: z.string().nullish(),
  model: z.string().nullish(),
  systemPrompt: z.string().nullish(),
})

export const SendMessageSchema = z.object({
  agentId: z.string(),
  content: z.string().min(1, 'Message content is required'),
  userId: z.string().nullish(),
})

export const GetMessagesSchema = z.object({
  agentId: z.string(),
  userId: z.string().nullish(),
  limit: z.coerce.number().int().positive().nullish(),
  offset: z.coerce.number().int().nonnegative().nullish(),
})

export const PiTextDeltaEventSchema = z.object({
  messageId: z.string(),
  delta: z.string(),
  isFinal: z.boolean().default(false),
})

export const PiThinkingDeltaEventSchema = z.object({
  messageId: z.string(),
  delta: z.string(),
})

export const PiToolStartEventSchema = z.object({
  messageId: z.string(),
  toolCallId: z.string(),
  toolName: z.string(),
  args: z.record(z.string(), z.unknown()),
})

export const PiToolEndEventSchema = z.object({
  messageId: z.string(),
  toolCallId: z.string(),
  toolName: z.string().nullish(),
  result: z.unknown().nullable(),
  error: z.string().nullish(),
})

export const PiAgentStartEventSchema = z.object({
  messageId: z.string(),
  agentId: z.string(),
})

export const PiAgentEndEventSchema = z.object({
  messageId: z.string(),
})

export const PiErrorEventSchema = z.object({
  messageId: z.string(),
  code: z.enum(['rate_limit', 'token_exceeded', 'api_error', 'unknown']),
  message: z.string(),
  recoverable: z.boolean(),
})

export const SuccessSchema = z.object({
  success: z.literal(true),
})

export const SendMessageResponseSchema = z.object({
  userMessage: ChatMessageSchema,
  agentMessageId: z.string(),
})

export const ChatSSEProtocolSchema = z.object({
  events: z.object({
    'pi-text-delta': PiTextDeltaEventSchema,
    'pi-thinking-delta': PiThinkingDeltaEventSchema,
    'pi-tool-start': PiToolStartEventSchema,
    'pi-tool-end': PiToolEndEventSchema,
    'pi-agent-start': PiAgentStartEventSchema,
    'pi-agent-end': PiAgentEndEventSchema,
    'pi-error': PiErrorEventSchema,
  }),
})

export const MessageRoundSchema = z.object({
  userMessage: ChatMessageSchema,
  agentMessages: z.array(ChatMessageSchema),
  timestamp: z.string(),
})

export const RoundsResponseSchema = z.object({
  rounds: z.array(MessageRoundSchema),
  hasMore: z.boolean(),
  oldestTimestamp: z.string().nullish(),
  newestTimestamp: z.string().nullish(),
})

export type MessageRole = z.infer<typeof MessageRoleSchema>
export type ToolCall = z.infer<typeof ToolCallSchema>
export type AgentSubRound = z.infer<typeof AgentSubRoundSchema>
export type ChatMessage = z.infer<typeof ChatMessageSchema>
export type Agent = z.infer<typeof AgentSchema>
export type CreateAgentInput = z.infer<typeof CreateAgentSchema>
export type UpdateAgentInput = z.infer<typeof UpdateAgentSchema>
export type SendMessageInput = z.infer<typeof SendMessageSchema>
export type GetMessagesInput = z.infer<typeof GetMessagesSchema>
export type MessageRound = z.infer<typeof MessageRoundSchema>
export type RoundsResponse = z.infer<typeof RoundsResponseSchema>
export type PiTextDeltaEvent = z.infer<typeof PiTextDeltaEventSchema>
export type PiThinkingDeltaEvent = z.infer<typeof PiThinkingDeltaEventSchema>
export type PiToolStartEvent = z.infer<typeof PiToolStartEventSchema>
export type PiToolEndEvent = z.infer<typeof PiToolEndEventSchema>
export type PiAgentStartEvent = z.infer<typeof PiAgentStartEventSchema>
export type PiAgentEndEvent = z.infer<typeof PiAgentEndEventSchema>
export type PiErrorEvent = z.infer<typeof PiErrorEventSchema>
export type ChatSSEProtocol = z.infer<typeof ChatSSEProtocolSchema>

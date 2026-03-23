// Re-export types from @mariozechner/pi-ai
export type {
  TextContent as PiTextContent,
  ThinkingContent as PiThinkingContent,
  ToolCall as PiToolCall,
  ImageContent as PiImageContent,
  UserMessage as PiUserMessage,
  AssistantMessage as PiAssistantMessage,
  ToolResultMessage as PiToolResultMessage,
  Message as PiMessage,
} from '@mariozechner/pi-ai'

// Usage type has additional 'cost' field in pi-ai, we use Pick to match our simplified version
import type { Usage } from '@mariozechner/pi-ai'
export type PiUsage = Pick<Usage, 'input' | 'output' | 'cacheRead' | 'cacheWrite' | 'totalTokens'>

// Re-export session types from @mariozechner/pi-coding-agent
export type {
  SessionHeader as PiSessionHeader,
  SessionMessageEntry as PiSessionEntry,
} from '@mariozechner/pi-coding-agent'

// PiSessionLine is a union of session header and entry
import type { PiSessionHeader, PiSessionEntry } from './pi-types'
export type PiSessionLine = PiSessionHeader | PiSessionEntry

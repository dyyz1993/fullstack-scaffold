import type { PiToolCall } from '@shared/modules/agent/pi-types'

export type ToolCallWithResult = PiToolCall & {
  result?: unknown
  error?: string
}

export type ToolCallMap = Map<string, ToolCallWithResult>

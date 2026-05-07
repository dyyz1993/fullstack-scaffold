import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { WebSocketPage } from '../WebSocketPage'
import type { WSStatus } from '@shared/schemas'

interface MockWSMessage {
  type: string
  payload: Record<string, unknown>
  timestamp?: number
}

interface MockWSStore {
  status: WSStatus
  messages: MockWSMessage[]
  connect: ReturnType<typeof vi.fn>
  disconnect: ReturnType<typeof vi.fn>
  echo: ReturnType<typeof vi.fn>
  ping: ReturnType<typeof vi.fn>
  broadcast: ReturnType<typeof vi.fn>
  notification: ReturnType<typeof vi.fn>
  clearMessages: ReturnType<typeof vi.fn>
}

const mockStore: MockWSStore = {
  status: 'closed',
  messages: [],
  connect: vi.fn(),
  disconnect: vi.fn(),
  echo: vi.fn().mockResolvedValue(undefined),
  ping: vi.fn().mockResolvedValue(undefined),
  broadcast: vi.fn(),
  notification: vi.fn(),
  clearMessages: vi.fn(),
}

vi.mock('@client/stores/chatWSStore', () => ({
  useChatWsStore: vi.fn(() => mockStore),
}))

describe('WebSocketPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore.status = 'closed'
    mockStore.messages = []
  })

  describe('Initial Render', () => {
    it('should render page title', () => {
      render(<WebSocketPage />)
      expect(screen.getByText('WebSocket Demo')).toBeInTheDocument()
    })

    it('should render page description', () => {
      render(<WebSocketPage />)
      expect(screen.getByText(/WebSocket with type inference/)).toBeInTheDocument()
    })

    it('should show closed status by default', () => {
      render(<WebSocketPage />)
      expect(screen.getByText('Closed')).toBeInTheDocument()
    })

    it('should render websocket container', () => {
      render(<WebSocketPage />)
      expect(screen.getByTestId('websocket-container')).toBeInTheDocument()
    })
  })

  describe('Connection Status', () => {
    it('should show open status when connected', () => {
      mockStore.status = 'open'
      render(<WebSocketPage />)
      expect(screen.getByText('Open')).toBeInTheDocument()
    })

    it('should show connecting status', () => {
      mockStore.status = 'connecting'
      render(<WebSocketPage />)
      expect(screen.getByText('Connecting')).toBeInTheDocument()
    })

    it('should show reconnecting status', () => {
      mockStore.status = 'reconnecting'
      render(<WebSocketPage />)
      expect(screen.getByText('Reconnecting')).toBeInTheDocument()
    })

    it('should show closed status', () => {
      mockStore.status = 'closed'
      render(<WebSocketPage />)
      expect(screen.getByText('Closed')).toBeInTheDocument()
    })
  })

  describe('Connect/Disconnect Buttons', () => {
    it('should render connect button', () => {
      render(<WebSocketPage />)
      const buttons = screen.getAllByText('Connect')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('should render disconnect button', () => {
      render(<WebSocketPage />)
      const buttons = screen.getAllByText('Disconnect')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('should call connect when connect button clicked', () => {
      render(<WebSocketPage />)
      fireEvent.click(screen.getByTestId('connect-ws-button'))
      expect(mockStore.connect).toHaveBeenCalledTimes(1)
    })

    it('should call disconnect when disconnect button clicked', () => {
      mockStore.status = 'open'
      render(<WebSocketPage />)
      fireEvent.click(screen.getByTestId('disconnect-ws-button'))
      expect(mockStore.disconnect).toHaveBeenCalledTimes(1)
    })

    it('should disable connect button when open', () => {
      mockStore.status = 'open'
      render(<WebSocketPage />)
      expect(screen.getByTestId('connect-ws-button')).toBeDisabled()
    })

    it('should disable connect button when connecting', () => {
      mockStore.status = 'connecting'
      render(<WebSocketPage />)
      expect(screen.getByTestId('connect-ws-button')).toBeDisabled()
    })

    it('should disable disconnect button when closed', () => {
      mockStore.status = 'closed'
      render(<WebSocketPage />)
      expect(screen.getByTestId('disconnect-ws-button')).toBeDisabled()
    })

    it('should enable disconnect button when open', () => {
      mockStore.status = 'open'
      render(<WebSocketPage />)
      expect(screen.getByTestId('disconnect-ws-button')).not.toBeDisabled()
    })
  })

  describe('Message Type Selector', () => {
    it('should render message type selector', () => {
      render(<WebSocketPage />)
      expect(screen.getByTestId('ws-message-type-select')).toBeInTheDocument()
    })

    it('should have echo selected by default', () => {
      render(<WebSocketPage />)
      expect(screen.getByTestId('ws-message-type-select')).toHaveValue('echo')
    })

    it('should change message type to ping', () => {
      render(<WebSocketPage />)
      fireEvent.change(screen.getByTestId('ws-message-type-select'), { target: { value: 'ping' } })
      expect(screen.getByTestId('ws-message-type-select')).toHaveValue('ping')
    })

    it('should change message type to broadcast', () => {
      render(<WebSocketPage />)
      fireEvent.change(screen.getByTestId('ws-message-type-select'), { target: { value: 'broadcast' } })
      expect(screen.getByTestId('ws-message-type-select')).toHaveValue('broadcast')
    })

    it('should change message type to notification', () => {
      render(<WebSocketPage />)
      fireEvent.change(screen.getByTestId('ws-message-type-select'), { target: { value: 'notification' } })
      expect(screen.getByTestId('ws-message-type-select')).toHaveValue('notification')
    })
  })

  describe('Message Input', () => {
    it('should render message input', () => {
      render(<WebSocketPage />)
      expect(screen.getByTestId('ws-message-input')).toBeInTheDocument()
    })

    it('should show type a message placeholder for echo', () => {
      render(<WebSocketPage />)
      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument()
    })

    it('should show ping placeholder when ping selected', () => {
      render(<WebSocketPage />)
      fireEvent.change(screen.getByTestId('ws-message-type-select'), { target: { value: 'ping' } })
      expect(screen.getByPlaceholderText('No message needed for ping')).toBeInTheDocument()
    })

    it('should disable input when ping is selected', () => {
      render(<WebSocketPage />)
      fireEvent.change(screen.getByTestId('ws-message-type-select'), { target: { value: 'ping' } })
      expect(screen.getByTestId('ws-message-input')).toBeDisabled()
    })

    it('should disable input when disconnected', () => {
      render(<WebSocketPage />)
      expect(screen.getByTestId('ws-message-input')).toBeDisabled()
    })

    it('should enable input when connected and echo type', () => {
      mockStore.status = 'open'
      render(<WebSocketPage />)
      expect(screen.getByTestId('ws-message-input')).not.toBeDisabled()
    })
  })

  describe('Send Message', () => {
    it('should disable send button when disconnected', () => {
      render(<WebSocketPage />)
      expect(screen.getByTestId('send-message-button')).toBeDisabled()
    })

    it('should enable send button when connected with message', () => {
      mockStore.status = 'open'
      render(<WebSocketPage />)
      fireEvent.change(screen.getByTestId('ws-message-input'), { target: { value: 'hello' } })
      expect(screen.getByTestId('send-message-button')).not.toBeDisabled()
    })

    it('should call echo when sending echo message', async () => {
      mockStore.status = 'open'
      render(<WebSocketPage />)
      fireEvent.change(screen.getByTestId('ws-message-input'), { target: { value: 'hello' } })
      fireEvent.click(screen.getByTestId('send-message-button'))

      await waitFor(() => {
        expect(mockStore.echo).toHaveBeenCalledWith({ message: 'hello' })
      })
    })

    it('should call ping when sending ping', async () => {
      mockStore.status = 'open'
      render(<WebSocketPage />)
      fireEvent.change(screen.getByTestId('ws-message-type-select'), { target: { value: 'ping' } })
      fireEvent.click(screen.getByTestId('send-message-button'))

      await waitFor(() => {
        expect(mockStore.ping).toHaveBeenCalled()
      })
    })

    it('should call broadcast when sending broadcast', async () => {
      mockStore.status = 'open'
      render(<WebSocketPage />)
      fireEvent.change(screen.getByTestId('ws-message-type-select'), { target: { value: 'broadcast' } })
      fireEvent.change(screen.getByTestId('ws-message-input'), { target: { value: 'broadcast msg' } })
      fireEvent.click(screen.getByTestId('send-message-button'))

      await waitFor(() => {
        expect(mockStore.broadcast).toHaveBeenCalledWith({
          message: 'broadcast msg',
          timestamp: expect.any(Number),
        })
      })
    })

    it('should call notification when sending notification', async () => {
      mockStore.status = 'open'
      render(<WebSocketPage />)
      fireEvent.change(screen.getByTestId('ws-message-type-select'), { target: { value: 'notification' } })
      fireEvent.change(screen.getByTestId('ws-message-input'), { target: { value: 'notif body' } })
      fireEvent.click(screen.getByTestId('send-message-button'))

      await waitFor(() => {
        expect(mockStore.notification).toHaveBeenCalledWith({
          title: 'User Notification',
          body: 'notif body',
          timestamp: expect.any(Number),
        })
      })
    })

    it('should clear input after sending', async () => {
      mockStore.status = 'open'
      render(<WebSocketPage />)
      const input = screen.getByTestId('ws-message-input')
      fireEvent.change(input, { target: { value: 'hello' } })
      fireEvent.click(screen.getByTestId('send-message-button'))

      await waitFor(() => {
        expect(input).toHaveValue('')
      })
    })

    it('should not send echo with empty message', () => {
      mockStore.status = 'open'
      render(<WebSocketPage />)
      fireEvent.click(screen.getByTestId('send-message-button'))
      expect(mockStore.echo).not.toHaveBeenCalled()
    })

    it('should send on Enter key press', async () => {
      mockStore.status = 'open'
      render(<WebSocketPage />)
      fireEvent.change(screen.getByTestId('ws-message-input'), { target: { value: 'enter test' } })
      fireEvent.keyDown(screen.getByTestId('ws-message-input'), { key: 'Enter' })

      await waitFor(() => {
        expect(mockStore.echo).toHaveBeenCalledWith({ message: 'enter test' })
      })
    })
  })

  describe('Messages Display', () => {
    it('should display message count', () => {
      mockStore.messages = [{ type: 'echo', payload: { msg: 'test' }, timestamp: 1000 }]
      render(<WebSocketPage />)
      expect(screen.getByTestId('message-count')).toHaveTextContent('Messages (1)')
    })

    it('should render clear button', () => {
      render(<WebSocketPage />)
      expect(screen.getByTestId('clear-messages-button')).toBeInTheDocument()
    })

    it('should call clearMessages when clear button clicked', () => {
      render(<WebSocketPage />)
      fireEvent.click(screen.getByTestId('clear-messages-button'))
      expect(mockStore.clearMessages).toHaveBeenCalledTimes(1)
    })
  })

  describe('Empty State', () => {
    it('should display empty state when no messages', () => {
      render(<WebSocketPage />)
      expect(screen.getByText('No messages yet. Connect and send a message!')).toBeInTheDocument()
    })
  })

  describe('Message List', () => {
    it('should display messages', () => {
      mockStore.messages = [
        { type: 'echo_request', payload: { message: 'hello' }, timestamp: 1000 },
        { type: 'echo_response', payload: { message: 'hello' }, timestamp: 1001 },
      ]
      render(<WebSocketPage />)
      const messages = screen.getAllByTestId('message-item')
      expect(messages).toHaveLength(2)
    })

    it('should display broadcast message', () => {
      mockStore.messages = [
        { type: 'broadcast', payload: { message: 'hi', timestamp: 2000 }, timestamp: 2000 },
      ]
      render(<WebSocketPage />)
      expect(screen.getAllByTestId('message-item')).toHaveLength(1)
    })

    it('should display notification message', () => {
      mockStore.messages = [
        { type: 'notification', payload: { title: 't', body: 'b' }, timestamp: 3000 },
      ]
      render(<WebSocketPage />)
      expect(screen.getAllByTestId('message-item')).toHaveLength(1)
    })

    it('should display connected message', () => {
      mockStore.messages = [
        { type: 'connected', payload: { timestamp: 4000 }, timestamp: 4000 },
      ]
      render(<WebSocketPage />)
      expect(screen.getAllByTestId('message-item')).toHaveLength(1)
    })

    it('should display unknown message type', () => {
      mockStore.messages = [
        { type: 'unknown_type', payload: { data: 'test' } },
      ]
      render(<WebSocketPage />)
      expect(screen.getAllByTestId('message-item')).toHaveLength(1)
    })
  })
})

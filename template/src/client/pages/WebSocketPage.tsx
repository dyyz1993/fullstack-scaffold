/**
 * WebSocket Page
 * Demonstrates WebSocket with type inference using GhostWSClient
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Plug, Wifi, WifiOff, Send, Trash2, MessageSquare, Radio, Bell, Activity, Loader2 } from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { createWS, WSClient, type AppWSProtocol } from '../services/wsClient';

type WSStatus = 'connecting' | 'open' | 'closed' | 'reconnecting';

interface Message {
  type: string;
  payload: unknown;
  timestamp?: number;
}

export const WebSocketPage: React.FC = () => {
  const [status, setStatus] = useState<WSStatus>('closed');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [messageType, setMessageType] = useState<'echo' | 'notification' | 'broadcast' | 'ping'>('echo');
  const wsClientRef = useRef<WSClient<AppWSProtocol> | null>(null);

  const connect = useCallback(() => {
    if (wsClientRef.current) return;
    const client = createWS(apiClient.api.ws);
    wsClientRef.current = client;

    client.onStatusChange((newStatus: WSStatus) => {
      setStatus(newStatus);
    });

    client.on('notification', (payload) => {
      setMessages((prev) => [...prev, { type: 'notification', payload, timestamp: payload.timestamp }]);
    });

    client.on('broadcast', (payload) => {
      setMessages((prev) => [...prev, { type: 'broadcast', payload, timestamp: payload.timestamp }]);
    });

    client.on('connected', (payload) => {
      setMessages((prev) => [...prev, { type: 'connected', payload, timestamp: payload.timestamp }]);
    });
  }, []);

  const disconnect = useCallback(() => {
    if (wsClientRef.current) {
      wsClientRef.current.close();
      wsClientRef.current = null;
      setStatus('closed');
    }
  }, []);

  const sendMessage = useCallback(async () => {
    if (!wsClientRef.current || status !== 'open') return;
    if (!inputMessage.trim()) return;

    try {
      if (messageType === 'echo') {
        const result = await wsClientRef.current.call('echo', { message: inputMessage });
        setMessages((prev) => [...prev, { type: 'echo', payload: result, timestamp: result.timestamp }]);
      } else if (messageType === 'ping') {
        const result = await wsClientRef.current.call('ping', {});
        setMessages((prev) => [...prev, { type: 'pong', payload: result, timestamp: result.timestamp }]);
      } else if (messageType === 'broadcast') {
        wsClientRef.current.emit('broadcast', { message: inputMessage, timestamp: Date.now() });
      } else if (messageType === 'notification') {
        wsClientRef.current.emit('notification', { title: 'User Notification', body: inputMessage, timestamp: Date.now() });
      }
      setInputMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [inputMessage, messageType, status]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  useEffect(() => {
    return () => {
      if (wsClientRef.current) {
        wsClientRef.current.close();
      }
    };
  }, []);

  const typeConfig: Record<string, { color: string; bg: string; icon: React.FC<{ className?: string }> }> = {
    ping: { color: 'text-cyan-500', bg: 'bg-cyan-500', icon: Activity },
    pong: { color: 'text-cyan-500', bg: 'bg-cyan-500', icon: Activity },
    echo: { color: 'text-purple-500', bg: 'bg-purple-500', icon: MessageSquare },
    broadcast: { color: 'text-orange-500', bg: 'bg-orange-500', icon: Radio },
    notification: { color: 'text-green-500', bg: 'bg-green-500', icon: Bell },
    connected: { color: 'text-blue-500', bg: 'bg-blue-500', icon: Wifi },
  };

  const statusColors: Record<WSStatus, string> = {
    connecting: 'text-yellow-500',
    open: 'text-green-600',
    closed: 'text-red-500',
    reconnecting: 'text-orange-500',
  };

  const isLoading = status === 'connecting' || status === 'reconnecting';

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Plug className="w-8 h-8 text-indigo-500" />
          WebSocket Demo
        </h1>
        <p className="text-gray-500 mt-2">
          Demonstrates WebSocket with type inference using GhostWSClient
        </p>
      </div>

      <div className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-700">Status:</span>
          <span className={`flex items-center gap-1 ${statusColors[status]}`}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : status === 'open' ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={connect}
            disabled={status === 'open' || isLoading}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              status === 'open' || isLoading
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            <Wifi className="w-4 h-4" />
            Connect
          </button>
          <button
            onClick={disconnect}
            disabled={status === 'closed'}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              status === 'closed'
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-red-500 text-white hover:bg-red-600'
            }`}
          >
            <WifiOff className="w-4 h-4" />
            Disconnect
          </button>
        </div>
      </div>

      <div className="mb-6 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex gap-4">
          <select
            value={messageType}
            onChange={(e) => setMessageType(e.target.value as typeof messageType)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="echo">Echo (RPC)</option>
            <option value="ping">Ping (RPC)</option>
            <option value="broadcast">Broadcast (Event)</option>
            <option value="notification">Notification (Event)</option>
          </select>
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={messageType === 'ping' ? 'No message needed for ping' : 'Type a message...'}
            disabled={status !== 'open' || messageType === 'ping'}
            className="flex-1 px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            onClick={sendMessage}
            disabled={status !== 'open' || (messageType !== 'ping' && !inputMessage.trim())}
            className={`flex items-center gap-2 px-6 py-3 text-base font-medium rounded-lg transition-colors ${
              status !== 'open' || (messageType !== 'ping' && !inputMessage.trim())
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-500 text-white hover:bg-indigo-600'
            }`}
          >
            <Send className="w-5 h-5" />
            Send
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Messages ({messages.length})</h3>
        <button
          onClick={clearMessages}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Clear
        </button>
      </div>

      <div className="border border-gray-200 rounded-xl bg-gray-50 h-[400px] overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <MessageSquare className="w-16 h-16 mb-4 text-gray-300" />
            <p>No messages yet. Connect and send a message!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const config = typeConfig[msg.type] || { color: 'text-gray-500', bg: 'bg-gray-500', icon: MessageSquare };
            const TypeIcon = config.icon;
            return (
              <div
                key={index}
                className="p-4 bg-white rounded-lg border-l-4 shadow-sm"
                style={{ borderLeftColor: msg.type === 'ping' || msg.type === 'pong' ? '#06b6d4' : msg.type === 'echo' ? '#a855f7' : msg.type === 'broadcast' ? '#f97316' : msg.type === 'connected' ? '#3b82f6' : '#22c55e' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-white ${config.bg}`}>
                    <TypeIcon className="w-3 h-3" />
                    {msg.type.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-400">
                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}
                  </span>
                </div>
                <pre className="text-sm text-gray-700 whitespace-pre-wrap break-words font-mono">
                  {JSON.stringify(msg.payload, null, 2)}
                </pre>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

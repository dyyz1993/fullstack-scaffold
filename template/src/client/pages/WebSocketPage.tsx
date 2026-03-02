/**
 * WebSocket Page
 * Demonstrates WebSocket with type inference
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Plug, Wifi, WifiOff, Send, Trash2, MessageSquare, Radio, Bell, Activity } from 'lucide-react';
import type { WSMessage, WSMessageType } from '@shared/schemas';

export const WebSocketPage: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<WSMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [messageType, setMessageType] = useState<WSMessageType>('echo');
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const wsUrl = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/api/websocket/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setConnected(true);
      setMessages((prev) => [
        ...prev,
        { type: 'notification', payload: { title: 'Connected', body: 'WebSocket connection established' }, timestamp: Date.now() },
      ]);
    };

    ws.onclose = () => {
      setConnected(false);
      setMessages((prev) => [
        ...prev,
        { type: 'notification', payload: { title: 'Disconnected', body: 'WebSocket connection closed' }, timestamp: Date.now() },
      ]);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WSMessage;
        setMessages((prev) => [...prev, message]);
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    };

    wsRef.current = ws;
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const sendMessage = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (!inputMessage.trim()) return;

    const message: WSMessage = {
      type: messageType,
      payload: messageType === 'echo' 
        ? { message: inputMessage } 
        : messageType === 'notification'
          ? { title: 'Notification', body: inputMessage }
          : inputMessage,
      timestamp: Date.now(),
    };

    wsRef.current.send(JSON.stringify(message));
    setInputMessage('');
  }, [inputMessage, messageType]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const typeConfig: Record<WSMessageType, { color: string; bg: string; icon: React.FC<{ className?: string }> }> = {
    ping: { color: 'text-cyan-500', bg: 'bg-cyan-500', icon: Activity },
    pong: { color: 'text-cyan-500', bg: 'bg-cyan-500', icon: Activity },
    echo: { color: 'text-purple-500', bg: 'bg-purple-500', icon: MessageSquare },
    broadcast: { color: 'text-orange-500', bg: 'bg-orange-500', icon: Radio },
    notification: { color: 'text-green-500', bg: 'bg-green-500', icon: Bell },
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Plug className="w-8 h-8 text-indigo-500" />
          WebSocket Demo
        </h1>
        <p className="text-gray-500 mt-2">
          Demonstrates WebSocket with type inference
        </p>
      </div>

      <div className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-700">Status:</span>
          {connected ? (
            <span className="flex items-center gap-1 text-green-600">
              <Wifi className="w-4 h-4" />
              Connected
            </span>
          ) : (
            <span className="flex items-center gap-1 text-red-500">
              <WifiOff className="w-4 h-4" />
              Disconnected
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={connect}
            disabled={connected}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              connected
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            <Wifi className="w-4 h-4" />
            Connect
          </button>
          <button
            onClick={disconnect}
            disabled={!connected}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !connected
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
            onChange={(e) => setMessageType(e.target.value as WSMessageType)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="echo">Echo</option>
            <option value="broadcast">Broadcast</option>
            <option value="notification">Notification</option>
            <option value="ping">Ping</option>
          </select>
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            disabled={!connected}
            className="flex-1 px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            onClick={sendMessage}
            disabled={!connected || !inputMessage.trim()}
            className={`flex items-center gap-2 px-6 py-3 text-base font-medium rounded-lg transition-colors ${
              !connected || !inputMessage.trim()
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
            const config = typeConfig[msg.type] || { color: 'text-gray-500', bg: 'bg-gray-500' };
            const TypeIcon = config.icon;
            return (
              <div
                key={index}
                className="p-4 bg-white rounded-lg border-l-4 shadow-sm"
                style={{ borderLeftColor: msg.type === 'ping' || msg.type === 'pong' ? '#06b6d4' : msg.type === 'echo' ? '#a855f7' : msg.type === 'broadcast' ? '#f97316' : '#22c55e' }}
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

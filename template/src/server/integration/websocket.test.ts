/**
 * Integration tests for WebSocket API
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'http';
import WebSocket from 'ws';
import app from '../index';
import { handleUpgrade } from '../ws-router';

describe('WebSocket Integration Tests', () => {
  let server: ReturnType<typeof createServer>;
  let port: number;
  let wsUrl: string;

  beforeAll(async () => {
    return new Promise<void>((resolve) => {
      server = createServer();
      
      server.on('upgrade', (req, socket, head) => {
        handleUpgrade(req, socket, head);
      });

      server.on('request', app.fetch);

      server.listen(0, () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          port = address.port;
          wsUrl = `ws://localhost:${port}/api/ws`;
          console.log(`Test WebSocket server started on port ${port}`);
        }
        resolve();
      });
    });
  }, 15000);

  afterAll(() => {
    return new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }, 15000);

  describe('Connection', () => {
    it('should connect and receive connected event', async () => {
    return new Promise<void>((done) => {
      const ws = new WebSocket(wsUrl);

      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        console.log('Received:', msg);

        expect(msg.type).toBe('connected');
        expect(msg.payload).toHaveProperty('timestamp');
        expect(typeof msg.payload.timestamp).toBe('number');

        ws.close();
        done();
      });

      ws.on('error', (err) => {
        console.error('WebSocket error:', err);
        done();
      });
    });
    });
  });

  describe('RPC - echo', () => {
    it('should echo message back', async () => {
    return new Promise<void>((done) => {
      const ws = new WebSocket(wsUrl);
      const testMessage = 'Hello, WebSocket!';

      ws.on('open', () => {
        ws.send(JSON.stringify({
          id: 'test-echo-1',
          method: 'echo',
          params: { message: testMessage },
        }));
      });

      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        
        if (msg.id === 'test-echo-1') {
          console.log('Echo response:', msg);
          expect(msg.result).toBeDefined();
          expect(msg.result.message).toBe(testMessage);
          expect(msg.result.timestamp).toBeDefined();
          expect(typeof msg.result.timestamp).toBe('number');

          ws.close();
          done();
        }
      });

      ws.on('error', (err) => {
        console.error('WebSocket error:', err);
        done();
      });
    });
    });
  });

  describe('RPC - ping', () => {
    it('should return pong', async () => {
    return new Promise<void>((done) => {
      const ws = new WebSocket(wsUrl);

      ws.on('open', () => {
        ws.send(JSON.stringify({
          id: 'test-ping-1',
          method: 'ping',
          params: {},
        }));
      });

      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        
        if (msg.id === 'test-ping-1') {
          console.log('Ping response:', msg);
          expect(msg.result).toBeDefined();
          expect(msg.result.pong).toBe(true);
          expect(msg.result.timestamp).toBeDefined();
          expect(typeof msg.result.timestamp).toBe('number');

          ws.close();
          done();
        }
      });

      ws.on('error', (err) => {
        console.error('WebSocket error:', err);
        done();
      });
    });
    });
  });

  describe('Events - broadcast', () => {
    it('should broadcast message to all clients', async () => {
    return new Promise<void>((done) => {
      const client1 = new WebSocket(wsUrl);
      const client2 = new WebSocket(wsUrl);
      const testMessage = 'Broadcast test message';
      let client1ReceivedConnected = false;
      let client2ReceivedConnected = false;
      let client2ReceivedBroadcast = false;

      const checkDone = () => {
        if (client1ReceivedConnected && client2ReceivedConnected && client2ReceivedBroadcast) {
          client1.close();
          client2.close();
          done();
        }
      };

      client1.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'connected') {
          client1ReceivedConnected = true;
          if (client1ReceivedConnected && client2ReceivedConnected) {
            client1.send(JSON.stringify({
              type: 'broadcast',
              payload: { message: testMessage, timestamp: Date.now() },
            }));
          }
        }
        checkDone();
      });

      client2.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'connected') {
          client2ReceivedConnected = true;
          if (client1ReceivedConnected && client2ReceivedConnected) {
            client1.send(JSON.stringify({
              type: 'broadcast',
              payload: { message: testMessage, timestamp: Date.now() },
            }));
          }
        } else if (msg.type === 'broadcast') {
          console.log('Client2 received broadcast:', msg);
          expect(msg.payload.message).toBe(testMessage);
          client2ReceivedBroadcast = true;
        }
        checkDone();
      });

      client1.on('error', (err) => console.error('Client1 error:', err));
      client2.on('error', (err) => console.error('Client2 error:', err));
    });
    });
  });

  describe('Error handling', () => {
    it('should return error for unknown RPC method', async () => {
    return new Promise<void>((done) => {
      const ws = new WebSocket(wsUrl);

      ws.on('open', () => {
        ws.send(JSON.stringify({
          id: 'test-unknown-1',
          method: 'unknownMethod',
          params: {},
        }));
      });

      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        
        if (msg.id === 'test-unknown-1') {
          console.log('Unknown method response:', msg);
          expect(msg.error).toBeDefined();
          expect(msg.error).toContain('Unknown RPC method');

          ws.close();
          done();
        }
      });

      ws.on('error', (err) => {
        console.error('WebSocket error:', err);
        done();
      });
    });
    });

    it('should handle invalid JSON', async () => {
    return new Promise<void>((done) => {
      const ws = new WebSocket(wsUrl);
      let receivedConnected = false;

      ws.on('open', () => {
        ws.send('not valid json');
      });

      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        
        if (msg.type === 'connected' && !receivedConnected) {
          receivedConnected = true;
          return;
        }

        console.log('Invalid JSON response:', msg);
        expect(msg.type).toBe('error');
        expect(msg.payload).toContain('Invalid JSON');

        ws.close();
        done();
      });

      ws.on('error', (err) => {
        console.error('WebSocket error:', err);
        done();
      });
    });
    });
  });
});

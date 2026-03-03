import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'http';
import WebSocket from 'ws';
import app, { handleWSUpgrade } from '../../index';

describe('WebSocket Routes', () => {
  let server: ReturnType<typeof createServer>;
  let port: number;
  let wsUrl: string;

  beforeAll(async () => {
    return new Promise<void>((resolve) => {
      server = createServer();
      
      server.on('upgrade', (req, socket, head) => {
        handleWSUpgrade(req, socket, head);
      });

      server.on('request', app.fetch);

      server.listen(0, () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          port = address.port;
          wsUrl = `ws://localhost:${port}/api/ws`;
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

          expect(msg.type).toBe('connected');
          expect(msg.payload).toHaveProperty('timestamp');
          expect(typeof msg.payload.timestamp).toBe('number');

          ws.close();
          done();
        });

        ws.on('error', () => done());
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
            expect(msg.result).toBeDefined();
            expect(msg.result.message).toBe(testMessage);
            expect(msg.result.timestamp).toBeDefined();

            ws.close();
            done();
          }
        });

        ws.on('error', () => done());
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
            expect(msg.result).toBeDefined();
            expect(msg.result.pong).toBe(true);

            ws.close();
            done();
          }
        });

        ws.on('error', () => done());
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
            expect(msg.error).toBeDefined();
            expect(msg.error).toContain('Unknown RPC method');

            ws.close();
            done();
          }
        });

        ws.on('error', () => done());
      });
    });
  });
});

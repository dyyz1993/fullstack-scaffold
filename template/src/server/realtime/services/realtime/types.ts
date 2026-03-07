export interface WSClient {
  id: string;
  send: (data: unknown) => void;
  close: () => void;
  readyState: number;
}

export interface WSServer {
  readonly clients: Map<string, WSClient>;
  broadcast: (data: unknown, exclude?: string[]) => void;
  send: (clientId: string, data: unknown) => boolean;
  close: (clientId: string) => void;
  size: number;
}

export interface WSServerFactory {
  create(): WSServer;
  getGlobal(): WSServer;
}

export type WSMessageHandler = (data: unknown, client: WSClient, wss: WSServer) => void;
export type WSConnectionHandler = (client: WSClient, wss: WSServer) => void;
export type WSDisconnectHandler = (client: WSClient, wss: WSServer) => void;

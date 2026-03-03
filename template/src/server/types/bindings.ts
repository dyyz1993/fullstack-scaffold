export interface AppBindings {
  DB?: D1Database;
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
  NOTIFICATION_DO?: DurableObjectNamespace;
  ENVIRONMENT?: string;
}

export interface CreateAppOptions {
  includeRealtime?: boolean;
}

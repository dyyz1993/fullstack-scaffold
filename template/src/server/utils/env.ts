export const isCloudflare = typeof globalThis !== 'undefined' && 
  ('WebSocketPair' in globalThis || (globalThis as any).isCloudflare === true);

export const isNode = !isCloudflare && typeof process !== 'undefined' && process.versions?.node !== undefined;

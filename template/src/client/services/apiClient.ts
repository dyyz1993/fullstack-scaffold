/**
 * API Client configuration
 * Provides typed access to backend API
 */

import { hc } from 'hono/client';
import type { AppType } from '@server/index';

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export function isSuccess<T>(response: unknown): response is ApiSuccess<T> {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    (response as { success: boolean }).success === true &&
    'data' in response
  );
}

export function isError(response: unknown): response is ApiError {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    (response as { success: boolean }).success === false &&
    'error' in response
  );
}

export function getErrorMessage(response: unknown): string {
  if (isError(response)) {
    return response.error;
  }
  return 'Unknown error';
}

/**
 * Create a type-safe API client
 * Usage: const client = createApiClient();
 *        const response = await client.api.todos.$get();
 */
export const createApiClient = () => {
  // @ts-ignore
  const baseUrl = import.meta.env.API_BASE_URL || '';
  return hc<AppType>(baseUrl);
};
/**
 * Singleton API client instance
 */
export const apiClient = createApiClient();


/**
 * 💡 客户端流解析工具
 * 自动从类型安全的响应中提取泛型 T
 */
export async function* consumeStream<R extends { json(): Promise<any> }>(
  responsePromise: Promise<R>
): AsyncIterable<Awaited<ReturnType<R['json']>>> {
  const res = (await responsePromise) as unknown as Response
  if (!res.ok || !res.body) return

  const reader = res.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n')
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          yield JSON.parse(line.slice(6))
        } catch (e) {
          console.error('Failed to parse SSE line', e)
        }
      }
    }
  }
}


/**
 * Mock mode flag for testing
 * Set to true to use mock data instead of real API
 */
export const USE_MOCK_SERVER = false;

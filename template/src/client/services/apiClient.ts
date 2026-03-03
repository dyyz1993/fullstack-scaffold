/**
 * API Client configuration
 * Provides typed access to backend API
 */

import { hc } from 'hono/client';
import type { AppType } from '@server/index';
import type { ApiSuccess, ApiError, ApiResponse } from '@shared/schemas';
import type { ClientResponse } from 'hono/client';

export type { ApiSuccess, ApiError, ApiResponse };

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

export const createApiClient = () => {
  const baseUrl = import.meta.env.API_BASE_URL || window.location.origin;
  return hc<AppType>(baseUrl);
};

export const apiClient = createApiClient();

export async function* consumeStream<T>(
  responsePromise: Promise<ClientResponse<T>>
): AsyncIterable<T> {
  const res = await responsePromise as unknown as Response
  if (!res.ok || !res.body) return

  const reader = res.body.getReader()
  const decoder = new TextDecoder()

  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        try {
          yield JSON.parse(data) as T
        } catch (e) {
          console.error('Failed to parse SSE line', e)
        }
      }
    }
  }
}

export const USE_MOCK_SERVER = false;

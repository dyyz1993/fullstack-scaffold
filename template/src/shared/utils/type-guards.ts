/**
 * Type guards for API responses
 */

import type { ApiError } from '@shared/schemas'

/**
 * Type guard for successful API responses
 * Usage:
 *   const data = await res.json()
 *   if (isSuccess<Todo>(data)) {
 *     // data.data is typed as Todo
 *   }
 */
export function isSuccess<T>(response: unknown): response is { success: true; data: T } {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    (response as { success: boolean }).success === true &&
    'data' in response
  )
}

/**
 * Type guard for error API responses
 */
export function isError(response: unknown): response is ApiError {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    (response as { success: boolean }).success === false &&
    'error' in response
  )
}

/**
 * Get error message from API response
 */
export function getErrorMessage(response: unknown): string {
  if (isError(response)) {
    return response.error
  }
  return 'Unknown error'
}

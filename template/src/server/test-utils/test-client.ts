/**
 * Type-safe test client for API testing
 * Pre-calculates types at compile time for better IDE performance
 */

import { testClient } from 'hono/testing'
import type { AppType } from '@server/index'
import { createApp } from '@server/app'

/**
 * Pre-calculated client type for better IDE performance
 * This avoids type instantiation at runtime
 */
export type TestClient = ReturnType<typeof testClient<AppType>>

/**
 * Create a type-safe test client with pre-calculated types
 * Usage:
 *   const client = createTestClient()
 *   const res = await client.api.todos.$get()
 *   const data = await res.json() // Type is automatically inferred
 */
export function createTestClient(): TestClient {
  const app = createApp()
  return testClient<AppType>(app)
}

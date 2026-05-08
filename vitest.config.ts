import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  test: {
    globals: true,
    include: [
      'src/__tests__/**/*.test.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**', 'template/**', 'testapp/**', 'my-app/**', 'test-scaffold-debug/**', 'e2e-debug-app/**'],
    testTimeout: 60000,
    hookTimeout: 60000,
    env: {
      NODE_ENV: 'test',
    },
  },
  resolve: {
    alias: {
      '@cli': resolve(__dirname, 'src/cli'),
    },
  },
})

import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  test: {
    globals: true,
    include: ['src/__tests__/**/*.test.ts', 'eslint-rules/__tests__/**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'template/**',
      'packages/**',
      'testapp/**',
      'my-app/**',
      'test-scaffold-debug/**',
      'e2e-debug-app/**',
    ],
    testTimeout: 60000,
    hookTimeout: 300000, // beforeAll 脚手架在并发 I/O 下偶发超 60s
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

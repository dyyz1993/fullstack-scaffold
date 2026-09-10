import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'

// react 插件仅含 client 的 preset 安装；cli-only 等服务端 preset 跳过
// 变量说明符：tsc 不做模块类型解析（cli-only 未安装该依赖）
const reactPluginPkg = '@vitejs/plugin-react'
const reactPlugin = (await import(/* @vite-ignore */ reactPluginPkg)
  .then((m: { default: () => unknown }) => m.default())
  .catch(() => null)) as unknown

export default defineConfig({
  plugins: reactPlugin ? [reactPlugin as never] : [],
  test: {
    passWithNoTests: true,
    globals: true,
    // jsdom 仅含 client 的 preset 安装；缺失时回退 node（服务端测试同样适用）
    environment: (() => {
      try {
        createRequire(import.meta.url).resolve('jsdom')
        return 'jsdom'
      } catch {
        return 'node'
      }
    })(),
    include: [
      '**/__tests__/**/*.test.ts',
      '**/__tests__/**/*.test.tsx',
      '**/integration/**/*.test.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 60000,
    hookTimeout: 60000,
    // setup-db-path 必须在前：把 :memory: 换成临时文件（libsql 事务与
    // :memory: 不兼容），vitest.setup 再注册 jest-dom 等
    setupFiles: ['./src/test/setup-db-path.ts', './vitest.setup.ts'],
    env: {
      NODE_ENV: 'test',
      SQLITE_PATH: ':memory:',
      ENABLE_DEV_TOKENS: 'true',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/test-setup.ts',
        'src/client/main.tsx',
        'src/server/entries/node.ts',
      ],
      thresholds: {
        lines: 71,
        functions: 71,
        branches: 60,
        statements: 71,
      },
    },
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@client': resolve(__dirname, 'src/client'),
      '@server': resolve(__dirname, 'src/server'),
      '@admin': resolve(__dirname, 'src/admin'),
      '@cli': resolve(__dirname, 'src/cli'),
    },
  },
})

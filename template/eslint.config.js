import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { requireHonoChainSyntax } from './eslint-rules/require-hono-chain-syntax.js'
import { requireTypeSafeTestClient } from './eslint-rules/require-type-safe-test-client.js'
import { noAmbiguousFilePaths } from './eslint-rules/no-ambiguous-file-paths.js'
import { noUtilFunctionsInService } from './eslint-rules/no-util-functions-in-service.js'
import { noDirectWsSse } from './eslint-rules/no-direct-ws-sse.js'
import { protectWsSseInterface } from './eslint-rules/protect-ws-sse-interface.js'
import { noBooleanSuccess } from './eslint-rules/no-boolean-success.js'
import { middlewareLocation, noMiddlewareOutsideDir } from './eslint-rules/middleware-location.js'
import { e2eTestLocation, noE2ETestOutsideDir } from './eslint-rules/e2e-test-location.js'
import { layerBoundary } from './eslint-rules/layer-boundary.js'

const localRules = {
  rules: {
    'require-hono-chain-syntax': requireHonoChainSyntax,
    'require-type-safe-test-client': requireTypeSafeTestClient,
    'no-ambiguous-file-paths': noAmbiguousFilePaths,
    'no-util-functions-in-service': noUtilFunctionsInService,
    'no-direct-ws-sse': noDirectWsSse,
    'protect-ws-sse-interface': protectWsSseInterface,
    'no-boolean-success': noBooleanSuccess,
    'middleware-location': middlewareLocation,
    'no-middleware-outside-dir': noMiddlewareOutsideDir,
    'e2e-test-location': e2eTestLocation,
    'no-e2e-test-outside-dir': noE2ETestOutsideDir,
    'layer-boundary': layerBoundary,
  },
}

export default tseslint.config(
  { ignores: ['dist', '.pi', 'lint-scripts', 'e2e'] },
  {
    extends: [eslint.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        browser: true,
        es2020: true,
        node: true,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'local-rules': localRules,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-restricted-globals': [
        'error',
        {
          name: 'fetch',
          message: '请使用 AI client 代替 fetch。参考: src/client/lib/ai-client.ts',
        },
      ],
      'local-rules/no-ambiguous-file-paths': 'error',
      'local-rules/no-direct-ws-sse': 'error',
    },
  },
  {
    files: ['src/server/**/*.ts'],
    rules: {
      'no-console': 'error',
      'local-rules/require-hono-chain-syntax': 'error',
      'local-rules/no-util-functions-in-service': 'warn',
      'local-rules/no-boolean-success': 'error',
      'local-rules/no-middleware-outside-dir': 'error',
    },
  },
  {
    files: ['src/server/middleware/**/*.ts'],
    ignores: ['src/server/middleware/index.ts'],
    rules: {
      'local-rules/middleware-location': 'error',
    },
  },
  {
    files: ['src/client/**/*.ts', 'src/client/**/*.tsx'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**/*.ts'],
    rules: {
      'no-console': 'off',
      'no-restricted-globals': 'off',
      'local-rules/require-type-safe-test-client': 'error',
    },
  },
  {
    files: ['src/client/services/wsClient.ts', 'src/client/services/sseClient.ts'],
    rules: {
      'local-rules/protect-ws-sse-interface': 'error',
    },
  },
  {
    files: ['tests/e2e/**/*.ts'],
    rules: {
      'local-rules/e2e-test-location': 'error',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'local-rules/no-e2e-test-outside-dir': 'error',
    },
  },
  {
    files: [
      'src/shared/modules/**/*.ts',
      'src/server/module-*/services/**/*.ts',
      'src/server/module-*/routes/*.ts',
      'src/client/stores/**/*.ts',
      'src/client/pages/**/*.tsx',
    ],
    ignores: [
      '**/__tests__/**/*.ts',
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/routes/index.ts',
      'src/client/services/apiClient.ts',
      'src/server/module-chat/routes/chat-routes.ts',
      'src/server/module-chat/services/chat-service.ts',
      'src/server/module-notifications/routes/notification-routes.ts',
    ],
    rules: {
      'local-rules/layer-boundary': 'error',
    },
  }
)

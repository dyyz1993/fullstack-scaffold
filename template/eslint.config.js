import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { requireHonoChainSyntax } from './eslint-rules/require-hono-chain-syntax.js'
import { requireTypeSafeTestClient } from './eslint-rules/require-type-safe-test-client.js'

const localRules = {
  rules: {
    'require-hono-chain-syntax': requireHonoChainSyntax,
    'require-type-safe-test-client': requireTypeSafeTestClient,
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
    },
  },
  {
    files: ['src/server/**/*.ts'],
    rules: {
      'no-console': 'error',
      'local-rules/require-hono-chain-syntax': 'error',
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
  }
)

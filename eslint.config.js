import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'dist/',
      'template/**',
      'testapp/**',
      'tests/**',
      'my-app/**',
      'e2e-debug-app/**',
      'src/client/**',
      'src/server/**',
      'src/shared/**',
      'src/types/**',
      'src/cli/**',
      'src/vite-env.d.ts',
      'eslint-rules/**',
      'lint-scripts/**',
      'scripts/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  }
)

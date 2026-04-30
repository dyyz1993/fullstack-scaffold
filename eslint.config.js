import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  { languageOptions: { globals: globals.node } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['template/**', 'node_modules/**', 'dist/**'],
  },
  {
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      'max-depth': ['warn', { max: 6 }],
      complexity: ['warn', { max: 32 }],
      eqeqeq: ['error', 'always'],
      'no-eval': 'error',
    },
  },
];

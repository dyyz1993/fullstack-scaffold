import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  { languageOptions: { globals: globals.node } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
  {
    ignores: [
      "template/**",
      "node_modules/**",
      "dist/**",
      "playwright-report/**",
      "test-results/**",
      "testapp/**",
      "my-app/**",
      "e2e-debug-app/**",
      "my-fullstack-app/**",
      "test-*/**",
    ],
  },
];

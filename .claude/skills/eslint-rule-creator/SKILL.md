---
name: eslint-rule-creator
description: >
  Create new ESLint custom rules for the create-biomimic-app subtraction-mode project generator.
  Rules enforce project conventions like chain syntax, path aliases, module boundaries.
  Use when: creating a new ESLint rule, adding a lint check, enforcing a coding convention,
  "create ESLint rule", "add lint rule", "enforce convention", or modifying eslint-rules/.
---

# ESLint Rule Creator

Create custom ESLint rules that enforce project conventions in both root and template.

## Architecture

```
eslint-rules/                        ← Root (CLI/generator project)
  {name}.js                          ← Rule implementation
  __tests__/{name}.test.js           ← Rule tests

template/eslint-rules/               ← Template (generated projects)
  {name}.js                          ← MUST be identical to root

eslint.config.js                     ← Root config (registers + activates rules)
template/eslint.config.js            ← Template config (same structure)
```

Key rule: eslint-rules/*.js files must be **byte-identical** between root and template. The config-sync validator (#15) detects drift.

## Creation Workflow

### Step 1: Create rule file

File: `eslint-rules/{name}.js`

```javascript
/**
 * Rule description
 */

export const {ruleName} = {
  meta: {
    type: 'problem' | 'suggestion' | 'layout',
    docs: {
      description: 'What this rule checks',
      recommended: true,
    },
    messages: {
      messageId: 'Error message with {{placeholder}}',
    },
    schema: [
      // Optional config schema
      { type: 'object', properties: { option: { type: 'string' } } }
    ],
  },
  create(context) {
    const filename = context.filename || context.getFilename()

    // Early return if file doesn't match target pattern
    if (!filename.includes('/target/path/')) return {}

    // Access options: context.options[0]?.optionName

    return {
      // AST visitor methods:
      // ImportDeclaration(node) — for import checks
      // CallExpression(node) — for function call checks
      // Program(node) — for file-level checks
      // ReturnStatement(node) — for return value checks
    }
  },
}

export default {ruleName}
```

### Step 2: Create test file

File: `eslint-rules/__tests__/{name}.test.js`

```javascript
import { describe, it, expect } from 'vitest'
import { RuleTester } from 'eslint'
import { {ruleName} } from '../{name}.js'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
})

describe('{name}', () => {
  it('should pass valid code', () => {
    ruleTester.run('{name}', {ruleName}, {
      valid: [
        '// Valid code here',
      ],
      invalid: [
        {
          code: '// Invalid code here',
          errors: [{ messageId: 'messageId' }],
        },
      ],
    })
  })
})
```

### Step 3: Register in both config files

Add to `eslint.config.js` AND `template/eslint.config.js`:

**Import** (top of file):
```javascript
import { {ruleName} } from './eslint-rules/{name}.js'
```

**Register** in `localRules.rules`:
```javascript
'{name}': {ruleName},
```

**Activate** in appropriate file-pattern config block:
```javascript
// For server rules:
'local-rules/{name}': 'error',

// For client/admin rules:
'local-rules/{name}': 'error',

// For test rules:
'local-rules/{name}': 'error',
```

Choose activation level:
- `error` — blocks commits
- `warn` — shows warning, doesn't block

### Step 4: Copy to template

```bash
cp eslint-rules/{name}.js template/eslint-rules/{name}.js
cp eslint-rules/__tests__/{name}.test.js template/eslint-rules/__tests__/{name}.test.js
```

### Step 5: Verify

```bash
npx eslint src/ --max-warnings=0                    # Root
cd template && npx eslint src/ --max-warnings=0     # Template
npx vitest run eslint-rules/__tests__/              # Tests
```

## File-Pattern Config Blocks

Choose the right config block for activation:

| Block | Files | Typical Rules |
|-------|-------|--------------|
| Global `**/*.{ts,tsx}` | All files | no-deep-relative-imports, no-ambiguous-file-paths |
| Server `src/server/**/*.ts` | Server code | require-hono-chain-syntax, no-boolean-success, route-location |
| Middleware `src/server/middleware/**/*.ts` | Middleware only | middleware-location |
| Client/Admin/Cli `src/{client,admin,cli}/**/*` | Frontend code | prefer-shared-types, no-direct-fetch, module-boundary |
| Test files `**/*.test.ts` | Test files | require-type-safe-test-client, no-disable-type-safe-client |
| Shared schemas `src/shared/modules/**/schemas.ts` | Zod schemas | require-file-openapi-props, require-nullable-for-optional |
| Framework `src/{shared/core,server/core}/**` | Framework layer | framework-protect |

## Common Patterns

### Filename-based filtering
```javascript
const filename = context.filename || context.getFilename()
const isTargetFile = filename.includes('/target/path/') && !filename.includes('__tests__')
if (!isTargetFile) return {}
```

### Import path checking
```javascript
ImportDeclaration(node) {
  const source = node.source
  if (!source || source.type !== 'Literal') return
  const importPath = source.value
  if (typeof importPath !== 'string') return
  if (importPath.startsWith('@shared')) return  // Allow path aliases
  // Check import path...
}
```

### Exempt specific files
```javascript
const EXEMPT_FILES = ['file-routes.ts', 'chat-routes.ts']
if (EXEMPT_FILES.some(f => filename.includes(f))) return {}
```

## Existing Rules Reference (35 rules)

| Rule | What it checks |
|------|---------------|
| require-hono-chain-syntax | Forces `.openapi()` chain syntax |
| require-type-safe-test-client | Tests must use `createTestClient()` |
| no-boolean-success | `z.literal(true)` not `z.boolean()` |
| no-direct-ws-sse | No `new WebSocket()` / `new EventSource()` |
| protect-ws-sse-interface | Don't modify framework WS/SSE interfaces |
| no-inline-schema | Schemas must come from shared/ |
| enforce-valid-method | Use `c.req.valid()` not raw methods |
| middleware-location | Middleware in correct directory |
| no-middleware-in-routes | No `.use()` in route files |
| layer-boundary | Framework/business separation |
| framework-protect | `@framework-baseline` header required |
| module-boundary | No cross-imports between client/admin/merchant/tenant |
| no-cross-module-service-import | No deep imports into other modules |
| no-direct-fetch | Use `apiClient` not raw `fetch` |
| no-disable-direct-fetch | Can't disable no-direct-fetch |
| no-disable-type-safe-client | Can't disable require-type-safe-test-client |
| route-location | Routes in module directories |
| prefer-shared-types | Use shared schemas, don't duplicate |
| no-type-assertion-in-rpc | No `as` on RPC responses |
| no-type-assertion-on-shared-types | No `as` on shared types |
| no-any-on-apiclient | No `any` on apiClient calls |
| no-util-functions-in-service | Utils go in utils/ |
| no-ambiguous-file-paths | Clear file naming |
| flat-routes-services | No nested subdirs in modules |
| no-new-old-serviceNaming | New naming convention |
| no-direct-zod-import-in-file-routes | File routes bundle optimization |
| require-file-openapi-props | OpenAPI metadata on schemas |
| require-nullable-for-optional | Explicit `.nullable()` |
| require-response-helpers | Use successResponse/errorResponse |
| require-antd-generic-types | Antd generics in admin |
| no-deep-relative-imports | Max 2 `../` levels |
| limit-type-comity | Route chain length limit |
| e2e-test-location | E2E tests in correct dir |
| no-e2e-test-outside-dir | No E2E tests outside tests/e2e/ |
| no-console | console.log in prod code |

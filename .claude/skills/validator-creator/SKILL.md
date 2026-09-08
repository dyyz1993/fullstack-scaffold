---
name: validator-creator
description: >
  Create new lint-scripts validators for the create-biomimic-app subtraction-mode project generator.
  Validators run in both pre-commit hooks and CI to enforce project conventions.
  Use when: creating a new validator, adding a lint check, enforcing a project convention,
  "create validator", "add validation", or modifying validate-all.ts.
---

# Validator Creator

Create validators that enforce project conventions in both pre-commit and CI.

## Architecture

```
lint-scripts/
├── validators/
│   ├── {name}.validator.ts    ← Validator logic (pure functions)
│   └── index.ts               ← Type exports
├── config/project.config.ts   ← Config objects
└── validate-all.ts            ← Registration (15+ validators)
```

Key rule: validators exist in BOTH root and template. Root validators validate the CLI/generator code. Template validators validate generated project code.

## Creation Workflow

### Step 1: Create validator file

File: `lint-scripts/validators/{name}.validator.ts`

```typescript
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

export interface {Name}Config {
  // config fields
}

export interface {Name}Error {
  // error fields
}

export function validate{Name}(
  config: {Name}Config,
  rootPath: string
): {Name}Error[] {
  // Validation logic - pure function, no side effects
  const errors: {Name}Error[] = []
  // ... scan files, check patterns, collect errors
  return errors
}

export function format{Name}Errors(errors: {Name}Error[]): string {
  if (errors.length === 0) return ''
  let output = `❌ Found ${errors.length} {name} issue(s):\n\n`
  for (const err of errors) {
    output += `  ${err.message}\n`
  }
  output += '\n📋 Guidelines:\n  {guidelines}\n'
  return output
}
```

### Step 2: Add config

File: `lint-scripts/config/project.config.ts`

Add import and config field:
```typescript
import { {Name}Config } from './validators/{name}.validator.js'

// In the config object:
{name}: {
  // config values
} satisfies {Name}Config,
```

### Step 3: Add type exports

File: `lint-scripts/validators/index.ts`

```typescript
export { {Name}Config, {Name}Error } from './{name}.validator.js'
```

### Step 4: Register in validate-all.ts

File: `lint-scripts/validate-all.ts`

1. Add import
2. Update counter: `[N/15]` → `[N/16]` (increment total)
3. Add validator block at the end (before `return results`):

```typescript
  // {N}. {Name} 验证
  console.log('🔍 [{N}/16] Checking {description}...')
  const {name}Errors = validate{Name}(projectConfig.{name}, rootPath)
  results.push({
    name: '{Name}',
    passed: {name}Errors.length === 0,
    errors: {name}Errors.length,
  })
  if ({name}Errors.length > 0) {
    console.error(format{Name}Errors({name}Errors))
  } else {
    console.log('  ✅ {success message}\n')
  }
```

### Step 5: Sync to template

Copy the same files to `template/lint-scripts/`:
- `validators/{name}.validator.ts`
- Update `validators/index.ts`
- Update `config/project.config.ts`
- Update `validate-all.ts` (same changes, same counter)

### Step 6: Verify

```bash
npx tsx lint-scripts/validate-all.ts        # Root
cd template && npx tsx lint-scripts/validate-all.ts  # Template
```

## Existing Validators Reference

| # | Name | File | What it checks |
|---|------|------|---------------|
| 1 | TODO/FIXME | todos.validator.ts | Unassigned TODOs |
| 2 | Sensitive Data | sensitive.validator.ts | Hardcoded secrets |
| 3 | Import Paths | imports.validator.ts | Path alias usage |
| 4 | Server RPC | server-rpc.validator.ts | Chain syntax, Zod schemas |
| 5 | Client RPC | client-rpc.validator.ts | No raw fetch |
| 6 | Directory Structure | directory-structure.validator.ts | File locations |
| 7 | Module Tests | module-tests.validator.ts | Test file presence |
| 8 | Test Quality | test-quality.validator.ts | Assertion count, edge cases |
| 9 | Client Tests | client-tests.validator.ts | Client test coverage |
| 10 | API Coverage | api-coverage.validator.ts | Route-to-test mapping |
| 11 | MD References | md-refs.validator.ts | Markdown link validity |
| 12 | Console.log | console-log.validator.ts | No console.log in prod |
| 13 | Schema Uniqueness | schema-uniqueness.validator.ts | Cross-module name collisions |
| 14 | Module Public API | module-public-api.validator.ts | Barrel exports for deps |
| 15 | Config Sync | config-sync.validator.ts | Root/template consistency |

## Key Rules

- Validator functions must be **pure** — take config + rootPath, return errors
- Always provide `formatXxxErrors()` for readable output
- Always sync to template (root and template must have identical validators)
- Update the counter `[N/total]` in ALL validator blocks when adding new one
- Config objects use `satisfies` for type safety

# Lint/Hooks/Validators 优化 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复 P0/P1 级 lint 架构问题——CI 缺失验证、dead rules、validator 同步、Husky 迁移、跨模块覆盖

**Architecture:** 7 个独立 task，每个 task 可独立验证和提交。按依赖顺序排列：先修 CI 和 dead rules（无风险），再同步 validator（需 template 双写），最后做 Husky 迁移和 module-boundary 扩展。

**Tech Stack:** TypeScript, ESLint flat config, Husky v9, GitHub Actions, Vitest

---

### Task 1: 将 validate:all + framework:check 加入 CI workflow

**Files:**
- Modify: `.github/workflows/ci.yml` (line 26-29, after `Lint CLI` step)

**Step 1: 在 `cli-checks` job 中添加 validator 和 framework check 步骤**

在 `.github/workflows/ci.yml` 的 `cli-checks` job 中，在 `Lint CLI` 步骤之后添加：

```yaml
      - name: Run all validators
        run: npm run validate:all
      - name: Check framework modifications
        run: npm run framework:check
```

**Step 2: 验证 CI YAML 语法**

Run: `node -e "require('yaml').parse(require('fs').readFileSync('.github/workflows/ci.yml','utf8')); console.log('YAML OK')"` 或目视检查缩进。

**Step 3: 提交**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add validate:all and framework:check to cli-checks job"
```

---

### Task 2: 注册 dead ESLint rules

**Files:**
- Modify: `eslint.config.js` (lines 5-39 imports, lines 41-77 localRules)
- Modify: `template/eslint.config.js` (same sections)

**Step 1: 在 `eslint.config.js` 中注册 `route-location` 和 `no-disable-type-safe-client`**

在 imports 区添加（line 39 之后）:
```javascript
import { noDisableTypeSafeClient } from './eslint-rules/no-disable-type-safe-client.js'
import { routeLocation } from './eslint-rules/route-location.js'
```

在 `localRules.rules` 对象中添加（line 75 之后）:
```javascript
    'no-disable-type-safe-client': noDisableTypeSafeClient,
    'route-location': routeLocation,
```

在 server files config block（line 143 之后）添加:
```javascript
      'local-rules/route-location': 'error',
```

在 test files config block（line 178 之后）添加:
```javascript
      'local-rules/no-disable-type-safe-client': 'error',
```

**Step 2: 同步修改 `template/eslint.config.js`**

完全相同的修改（template 的行号偏移量不同，但内容一样）。

**Step 3: 验证 ESLint 不报错**

Run: `npx eslint src/ --max-warnings=0 2>&1 | head -20`

**Step 4: 提交**

```bash
git add eslint.config.js template/eslint.config.js
git commit -m "feat: register dead ESLint rules (route-location, no-disable-type-safe-client)"
```

---

### Task 3: 同步 2 个新 validator 到 template

**Files:**
- Copy: `lint-scripts/validators/schema-uniqueness.validator.ts` → `template/lint-scripts/validators/schema-uniqueness.validator.ts`
- Copy: `lint-scripts/validators/module-public-api.validator.ts` → `template/lint-scripts/validators/module-public-api.validator.ts`
- Modify: `template/lint-scripts/validate-all.ts` (添加 validator 13/14)
- Modify: `template/lint-scripts/validators/index.ts` (添加新类型导出)
- Modify: `template/lint-scripts/config/project.config.ts` (添加新 config 字段)

**Step 1: 复制 validator 文件**

```bash
cp lint-scripts/validators/schema-uniqueness.validator.ts template/lint-scripts/validators/
cp lint-scripts/validators/module-public-api.validator.ts template/lint-scripts/validators/
```

**Step 2: 更新 template/lint-scripts/validate-all.ts**

- 添加两个 import（在 console-log import 之后）:
```typescript
import {
  validateSchemaUniqueness,
  formatSchemaUniquenessErrors,
} from './validators/schema-uniqueness.validator.js'
import {
  validateModulePublicApi,
  formatModulePublicApiErrors,
} from './validators/module-public-api.validator.js'
```

- 将所有 `[N/12]` 改为 `[N/14]`
- 在 validator 12 (Console.log) 之后添加 validator 13 和 14（照搬 root 的 validate-all.ts 对应代码）

**Step 3: 更新 template/lint-scripts/validators/index.ts**

添加 `SchemaUniquenessConfig/Error` 和 `ModulePublicApiConfig/Error` 类型导出（照搬 root 的 index.ts）。

**Step 4: 更新 template/lint-scripts/config/project.config.ts**

添加 `schemaUniqueness` 和 `modulePublicApi` 配置字段（照搬 root 的 project.config.ts）。

**Step 5: 验证 template validators 通过**

Run: `cd template && npx tsx lint-scripts/validate-all.ts`

**Step 6: 提交**

```bash
git add template/lint-scripts/
git commit -m "feat: sync schema-uniqueness and module-public-api validators to template"
```

---

### Task 4: Husky v4 → v9 迁移

**Files:**
- Modify: `.husky/pre-commit`
- Modify: `.husky/pre-push`
- Modify: `.husky/commit-msg`
- Modify: `.husky/post-commit`
- Delete: `.husky/_/` directory (整个目录)

**Step 1: 更新 `.husky/pre-commit`**

替换为 Husky v9 格式（去掉 shebang 和 husky.sh sourcing）：

```sh
echo "Running TypeScript type check..."
npm run typecheck

echo "Running all validators..."
npm run validate:all

echo "Checking MD file references..."
npm run check:refs

echo "Checking framework modifications..."
npm run framework:check

npx lint-staged --concurrent false

echo "Running smart tests for changed files..."
npm run test:smart:staged
```

**Step 2: 更新 `.husky/pre-push`**

```sh
echo "🔍 Pre-push verification..."

echo "  → TypeScript type check..."
npm run typecheck

echo "  → Smart tests for changed files..."
npm run test:smart:staged

echo "✅ All pre-push checks passed."
```

**Step 3: 更新 `.husky/commit-msg`**

```sh
npx commitlint --edit $1
```

**Step 4: 更新 `.husky/post-commit`**

```sh
node --import tsx/esm lint-scripts/post-commit-track.ts
```

**Step 5: 删除废弃的 `_` 目录**

```bash
rm -rf .husky/_/
```

**Step 6: 验证 hooks 仍然工作**

Run: `git commit --allow-empty -m "chore: test husky v9 migration"` (之后 reset 掉)

**Step 7: 提交**

```bash
git add .husky/
git commit -m "chore: migrate husky hooks from v4 to v9 format"
```

---

### Task 5: module-boundary.js 扩展覆盖 @merchant/@tenant

**Files:**
- Modify: `eslint-rules/module-boundary.js` (lines 34-44)
- Copy to: `template/eslint-rules/module-boundary.js` (同步)

**Step 1: 扩展 modulePaths 和 moduleNames**

在 `module-boundary.js` 的 `modulePaths` 和 `moduleNames` 对象中添加：

```javascript
const modulePaths = {
  client: '/client/',
  cli: '/cli/',
  admin: '/admin/',
  merchant: '/merchant/',
  tenant: '/tenant/',
}

const moduleNames = {
  client: 'client',
  cli: 'cli',
  admin: 'admin',
  merchant: 'merchant',
  tenant: 'tenant',
}
```

同时更新文件头注释（line 8-10）添加 merchant 和 tenant。

**Step 2: 同步到 template**

```bash
cp eslint-rules/module-boundary.js template/eslint-rules/module-boundary.js
```

**Step 3: 验证 ESLint 不报新错误**

Run: `npx eslint src/ --max-warnings=0`

**Step 4: 提交**

```bash
git add eslint-rules/module-boundary.js template/eslint-rules/module-boundary.js
git commit -m "feat: extend module-boundary rule to cover @merchant and @tenant"
```

---

### Task 6: 新增 root/template 一致性 validator

**Files:**
- Create: `lint-scripts/validators/config-sync.validator.ts`
- Modify: `lint-scripts/validate-all.ts` (添加 validator 15)
- Modify: `lint-scripts/validators/index.ts` (添加类型导出)
- Modify: `lint-scripts/config/project.config.ts` (添加 config)

**Step 1: 创建 validator**

`lint-scripts/validators/config-sync.validator.ts`:

```typescript
/**
 * Root/Template 配置同步验证器
 *
 * 检查以下文件在 root 和 template 之间是否一致：
 * 1. eslint-rules/*.js — 所有 ESLint 自定义规则
 * 2. lint-scripts/validators/*.validator.ts — 验证器文件（排除新增的）
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

export interface ConfigSyncConfig {
  rootDir: string
  templateDir: string
  checkPairs: Array<{ root: string; template: string; label: string }>
}

export interface ConfigSyncError {
  file: string
  diffType: 'missing_in_template' | 'content_differs'
  label: string
}

export function validateConfigSync(
  config: ConfigSyncConfig,
  rootPath: string
): ConfigSyncError[] {
  const errors: ConfigSyncError[] = []

  for (const pair of config.checkPairs) {
    const rootDir = join(rootPath, pair.root)
    const templateDir = join(rootPath, pair.template)

    if (!existsSync(rootDir) || !existsSync(templateDir)) continue

    const rootFiles = new Set(
      readdirSync(rootDir)
        .filter(f => f.endsWith('.js') || f.endsWith('.ts'))
        .filter(f => !f.endsWith('.test.ts') && !f.endsWith('.d.ts'))
    )

    for (const file of rootFiles) {
      const rootContent = readFileSync(join(rootDir, file), 'utf-8')
      const templatePath = join(templateDir, file)

      if (!existsSync(templatePath)) {
        errors.push({ file, diffType: 'missing_in_template', label: pair.label })
        continue
      }

      const templateContent = readFileSync(templatePath, 'utf-8')
      if (rootContent !== templateContent) {
        errors.push({ file, diffType: 'content_differs', label: pair.label })
      }
    }
  }

  return errors
}

export function formatConfigSyncErrors(errors: ConfigSyncError[]): string {
  if (errors.length === 0) return ''

  let output = `❌ Found ${errors.length} root/template sync issue(s):\n\n`

  for (const err of errors) {
    if (err.diffType === 'missing_in_template') {
      output += `  ${err.label}/${err.file}: missing in template\n`
    } else {
      output += `  ${err.label}/${err.file}: content differs\n`
    }
  }

  output += '\n📋 Run: cp -r <root>/<dir>/* template/<dir>/ to sync\n'
  return output
}
```

**Step 2: 更新 `lint-scripts/config/project.config.ts`**

添加：
```typescript
configSync: {
  rootDir: '.',
  templateDir: 'template',
  checkPairs: [
    { root: 'eslint-rules', template: 'template/eslint-rules', label: 'eslint-rules' },
  ],
} satisfies ConfigSyncConfig,
```

**Step 3: 在 `lint-scripts/validate-all.ts` 中添加 validator 15**

- 添加 import
- 添加 validator 15/15 步骤
- 更新编号 [N/14] → [N/15]

**Step 4: 更新 `lint-scripts/validators/index.ts`**

添加 `ConfigSyncConfig` 和 `ConfigSyncError` 导出。

**Step 5: 验证**

Run: `npx tsx lint-scripts/validate-all.ts`

**Step 6: 提交**

```bash
git add lint-scripts/
git commit -m "feat: add config-sync validator for root/template consistency"
```

---

### Task 7: pre-commit 性能优化（移除 pre-push 重复 typecheck）

**Files:**
- Modify: `.husky/pre-push`

**Step 1: 精简 pre-push hook**

将 pre-push 从跑 typecheck + smart-test 改为仅跑 smart-test（typecheck 已在 pre-commit 跑过）：

```sh
echo "🔍 Pre-push verification..."

echo "  → Smart tests for changed files..."
npm run test:smart:staged

echo "✅ All pre-push checks passed."
```

**Step 2: 验证 git push 仍能正常工作**

（实际在 Step 7 推送时验证）

**Step 3: 提交**

```bash
git add .husky/pre-push
git commit -m "perf: remove duplicate typecheck from pre-push hook"
```

---

## 验证总步骤

每个 task 完成后执行：

```bash
# 1. 本地验证
npm run typecheck
npx tsx lint-scripts/validate-all.ts

# 2. 最终推送后验证 CI
gh run list --limit 1
```

## 依赖关系

```
Task 1 (CI) ──────── 独立
Task 2 (dead rules) ─ 独立
Task 3 (sync validators) ─ 独立
Task 4 (Husky v9) ─── 独立（但应在 Task 7 之前）
Task 5 (module-boundary) ─ 独立
Task 6 (config-sync validator) ─ 独立
Task 7 (pre-push优化) ── 依赖 Task 4（Husky 格式）
```

建议执行顺序：1 → 2 → 3 → 5 → 4 → 7 → 6（先做简单无风险的，再做 format 变更和新增 validator）

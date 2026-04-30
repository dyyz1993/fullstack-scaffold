# Code Quality Audit Fix Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix P0/P1 code quality issues identified in ESLint/rules/scripts audit

**Architecture:** Incremental fixes — remove dead code, fix security deps, integrate orphaned lint rules, add test coverage for custom ESLint rules, clean up root config

**Tech Stack:** ESLint flat config, Vitest, TypeScript, npm

---

## Task 1: Remove vm2 dependency (P0-Security)

**Files:**

- Modify: `template/package.json` (remove vm2)
- Modify: `template/package-lock.json` (npm uninstall)

**Step 1: Check vm2 usage**

Run: `cd template && grep -r "vm2\|from 'vm2'" src/ --include="*.ts" -l`
Expected: If no usage → safe to remove. If usage → replace with isolated-vm.

**Step 2: Remove dependency**

Run: `cd template && npm uninstall vm2`

**Step 3: Verify typecheck + tests**

Run: `cd template && npx tsc --noEmit && npm run test:smart`
Expected: PASS

**Step 4: Commit**

```bash
git add template/package.json template/package-lock.json
git commit -m "chore: remove deprecated vm2 dependency (CVE-2023-37903)"
```

---

## Task 2: Remove dead legacy ESLint config (P0-DeadCode)

**Files:**

- Delete: `template/.eslintrc.routes.json`
- Verify: `template/lint-scripts/eslint-routes-permission.js` and `eslint-route-auth.js` — check if they're used by any other tool

**Step 1: Check if legacy plugins are referenced anywhere**

Run: `cd template && grep -r "eslintrc.routes\|eslint-routes-permission\|eslint-route-auth" . --include="*.ts" --include="*.js" --include="*.json" -l`
Expected: Only `.eslintrc.routes.json` itself references them → both are dead code.

**Step 2: Delete legacy config**

```bash
rm template/.eslintrc.routes.json
```

**Step 3: Evaluate route plugins**

Check if `lint-scripts/eslint-routes-permission.js` and `lint-scripts/eslint-route-auth.js` contain useful logic. If yes → migrate to flat config in Task 3. If no → delete.

**Step 4: Commit**

```bash
git add -u template/.eslintrc.routes.json
git commit -m "chore: remove dead legacy eslintrc.routes.json config"
```

---

## Task 3: Integrate route permission/auth lint rules into flat config (P0-Integration)

**Files:**

- Read: `template/lint-scripts/eslint-routes-permission.js`
- Read: `template/lint-scripts/eslint-route-auth.js`
- Modify: `template/eslint.config.js` (add route plugins to flat config)

**Step 1: Read existing plugin implementations**

Read both plugin files to understand their logic:

- `eslint-routes-permission.js`: Checks route handlers for permission checks
- `eslint-route-auth.js`: Checks that non-public routes have auth middleware

**Step 2: Add plugins to flat config**

Add the route plugin files as ESLint plugins in the appropriate override block (server routes). Configure with the same publicRoutes whitelist.

**Step 3: Verify rules execute**

Run: `cd template && npx eslint src/server/module-tenant/routes/tenant-routes.ts --no-ignore`
Expected: No errors (existing routes should already comply)

**Step 4: Test with a non-compliant route (optional)**

Temporarily remove auth middleware from a route, run eslint, verify the rule catches it, then revert.

**Step 5: Commit**

```bash
git add template/eslint.config.js
git commit -m "feat(eslint): integrate route permission/auth lint plugins into flat config"
```

---

## Task 4: Add root CLAUDE.md (P1)

**Files:**

- Create: `CLAUDE.md`

**Step 1: Write CLAUDE.md for root project**

Content should cover:

- Project: create-biomimic-app CLI tool
- Commands: `npm run dev`, `npm run test`, `npm run typecheck`
- Architecture: CLI generator (src/) + template app (template/)
- Generator flow: prompts → module-registry → file operations
- Key files: src/index.ts, src/types.ts, src/module-registry.ts, src/commands/
- Testing: `src/integration.test.ts`, `src/utils.test.ts`
- Template is a separate app with its own toolchain

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add root CLAUDE.md for CLI project"
```

---

## Task 5: Enhance root ESLint config (P1)

**Files:**

- Modify: `eslint.config.js`

**Step 1: Add missing rules to root config**

Add these rules (matching template conventions):

- `no-console: ["error", { allow: ["warn", "error"] }]`
- `@typescript-eslint/consistent-type-imports: "error"`
- `max-depth: ["error", 4]`
- `complexity: ["error", 20]`
- `eqeqeq: "error"`
- `no-eval: "error"`

**Step 2: Run ESLint on root**

Run: `npx eslint src/ --max-warnings=0`
Expected: May find violations — fix them.

**Step 3: Fix any violations**

If `no-console` flags violations → replace with proper logging or add allowed exceptions.

**Step 4: Commit**

```bash
git add eslint.config.js src/
git commit -m "feat(eslint): add strict rules to root project config"
```

---

## Task 6: Add tests for critical custom ESLint rules (P1)

**Files:**

- Create tests in `template/eslint-rules/__tests__/`

Priority order for untested rules:

1. `framework-protect.js` — most complex, protects framework files
2. `no-direct-fetch.js` — security boundary
3. `no-any-on-apiclient.js` — type safety
4. `middleware-location.js` — architecture enforcement
5. `prefer-shared-types.js` — largest untested rule

**Step 1: Create test file for framework-protect.js**

Follow the pattern from existing tests (enforce-valid-method.test.ts).

**Step 2: Run tests**

Run: `cd template && npx vitest run eslint-rules/__tests__/framework-protect.test.ts`
Expected: PASS

**Step 3-4: Repeat for no-direct-fetch, no-any-on-apiclient, middleware-location**

**Step 5: Commit**

```bash
git add template/eslint-rules/__tests__/
git commit -m "test: add tests for critical custom ESLint rules"
```

---

## Task 7: Clean up template root directory (P1)

**Files:**

- Modify: `template/.gitignore` (add entries)
- Delete or gitignore: test artifacts, data/, logs/, uploads/

**Step 1: Add entries to template/.gitignore**

```
# Test artifacts
tests/e2e/case-*.spec.ts
auth-inject.html

# Runtime directories
data/
logs/
uploads/
```

**Step 2: Remove tracked artifacts from git**

```bash
git rm --cached template/auth-inject.html 2>/dev/null || true
git rm -r --cached template/data/ 2>/dev/null || true
git rm -r --cached template/logs/ 2>/dev/null || true
git rm -r --cached template/uploads/ 2>/dev/null || true
```

**Step 3: Commit**

```bash
git add template/.gitignore
git commit -m "chore: gitignore test artifacts and runtime directories"
```

---

## Task 8: Fix root lint-staged asymmetry (P2)

**Files:**

- Modify: `package.json` (root lint-staged config)

**Step 1: Add ESLint to root lint-staged for template files**

Current:

```json
"template/src/**/*.{ts,tsx}": ["prettier --write"]
```

Change to:

```json
"template/src/**/*.{ts,tsx}": ["prettier --write", "eslint --fix --max-warnings=0 --no-warn-ignored"]
```

Wait — this might cause double-running since template has its own lint-staged. Evaluate if this is needed. If template pre-commit already handles it, skip this task.

**Step 2: Evaluate and decide**

If root lint-staged runs template linting, it conflicts with template's own husky hooks. Better approach: root lint-staged should ONLY handle root files. Template files are the template's responsibility.

**Step 3: Commit (if changed)**

---

## Summary

| Task                       | Priority | Effort | Impact               |
| -------------------------- | -------- | ------ | -------------------- |
| 1. Remove vm2              | P0       | 5min   | Security             |
| 2. Remove dead config      | P0       | 5min   | Code hygiene         |
| 3. Integrate route plugins | P0       | 30min  | Lint effectiveness   |
| 4. Add root CLAUDE.md      | P1       | 15min  | Developer experience |
| 5. Enhance root ESLint     | P1       | 15min  | Code quality         |
| 6. Add ESLint rule tests   | P1       | 60min  | Reliability          |
| 7. Clean template root     | P1       | 10min  | Code hygiene         |
| 8. Fix lint-staged         | P2       | 10min  | Consistency          |

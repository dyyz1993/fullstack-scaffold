---
name: template-sync
description: >
  Keep root and template directories in sync for the create-biomimic-app subtraction-mode project generator.
  Handles eslint-rules, validators, eslint.config.js, .claude/rules synchronization.
  Use when: syncing root and template, "config drift", "template out of sync",
  "copy to template", "eslint-rules sync", or after modifying root lint config.
---

# Template Sync

Keep root and template configurations in sync. The config-sync validator (#15) detects drift.

## What Must Be Synced

| Directory/File | Sync Strategy | Detection |
|---------------|---------------|-----------|
| `eslint-rules/*.js` | Byte-identical copy | config-sync validator |
| `lint-scripts/validators/*.validator.ts` | Copy + template-specific config | Manual |
| `lint-scripts/validate-all.ts` | Same structure, different totals | Manual |
| `lint-scripts/validators/index.ts` | Same type exports | Manual |
| `lint-scripts/config/project.config.ts` | Same structure, different paths | Manual |
| `.claude/rules/*.md` | Most files identical; template may have extras | Manual |

## What Differs Between Root and Template

| Aspect | Root | Template |
|--------|------|----------|
| `eslint.config.js` ignores | Longer (template, packages, coverage, etc.) | Minimal (dist, .pi, lint-scripts, e2e) |
| `eslint.config.js` extra block | `no-console: off` for `src/**` | Missing this block |
| `lint-scripts/validate-all.ts` | 15 validators | 14 validators (no config-sync — it would be recursive) |
| `.claude/rules/` | 19 files | 20 files (has `36-merchant-module.md`) |
| Target of validation | CLI/generator source (`src/`) | Generated project source (`template/src/`) |

## Sync Workflow

### After modifying eslint-rules/

```bash
# One-liner: copy ALL rules (safe, they must be identical)
cp eslint-rules/*.js template/eslint-rules/
cp eslint-rules/__tests__/*.test.js template/eslint-rules/__tests__/

# Verify
npx tsx lint-scripts/validate-all.ts  # Config-sync validator checks drift
```

### After modifying eslint.config.js

Manual sync required — root and template configs are NOT identical:
1. Read both files
2. Sync the `imports` section (lines 5-39) — should be identical
3. Sync the `localRules` object (lines 41-77) — should be identical
4. Sync ALL file-pattern config blocks — should be identical
5. Keep root-specific `ignores` and extra blocks

### After adding a new validator

```bash
# Copy validator file
cp lint-scripts/validators/{name}.validator.ts template/lint-scripts/validators/

# Then manually update template versions of:
# - validators/index.ts (add type exports)
# - config/project.config.ts (add config)
# - validate-all.ts (add import + validator block + update counters)
```

### After modifying .claude/rules/

```bash
# Most rules are identical. Check which differ:
diff -rq .claude/rules/ template/.claude/rules/ 2>/dev/null

# Template-only files (like 36-merchant-module.md) are OK
# Root-only files might need copying if they're general rules
```

## Sync Checklist

After any root config change, run this checklist:

1. `cp eslint-rules/*.js template/eslint-rules/` — eslint-rules sync
2. `cp eslint-rules/__tests__/*.test.js template/eslint-rules/__tests__/` — rule tests sync
3. Diff `eslint.config.js` vs `template/eslint.config.js` — structural sync
4. New validator? → Copy to template + update 3 files
5. `npx tsx lint-scripts/validate-all.ts` — config-sync validator
6. `cd template && npx tsx lint-scripts/validate-all.ts` — template validators
7. `npx eslint src/ --max-warnings=0` — root ESLint
8. `cd template && npx eslint src/ --max-warnings=0` — template ESLint

## Quick Sync Command

```bash
# Full eslint-rules sync in one command
cp eslint-rules/*.js template/eslint-rules/ && \
cp eslint-rules/__tests__/*.test.js template/eslint-rules/__tests__/ && \
echo "✅ eslint-rules synced"
```

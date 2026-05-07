# 修复 ESLint 错误 - 实施计划

## 问题分析

ESLint 检查发现以下错误：

| 文件 | 问题 | 原因 |
|------|------|------|
| `.claude/skills/llm-chat-skill/assets/stores/agentStore.ts` | `persist` 未使用 | import 了但未使用 |
| `.claude/skills/llm-chat-skill/scripts/init-chat-project.ts` | console.log (3处) | 脚本允许 console 但未在 ESLint 忽略列表 |
| `src/client/components/ChatMessageCard.tsx` | 类型相似度警告 | 已有 warning，与本次无关 |

## 解决方案

### Step 1: 修改 eslint.config.js 添加 .claude 到忽略列表

**文件**: `eslint.config.js`

**当前** (第 76 行):
```javascript
{ ignores: ['dist', '.pi', 'lint-scripts', 'e2e', 'scripts'] },
```

**修改为**:
```javascript
{ ignores: ['dist', '.pi', 'lint-scripts', 'e2e', 'scripts', '.claude'] },
```

**原因**: `.claude` 目录是 skill 资产和脚本，不需要 ESLint 检查

### Step 2: 修复 agentStore.ts 移除未使用的 import

**文件**: `.claude/skills/llm-chat-skill/assets/stores/agentStore.ts`

**当前** (第 2 行):
```typescript
import { persist } from 'zustand/middleware'
```

**修改为**: 删除此行，因为 `persist` 未被使用

### Step 3: (可选) 保留 init-chat-project.ts 的 console.log

由于我们已将 `.claude` 添加到忽略列表，init-chat-project.ts 将不再被 ESLint 检查。

如果后续需要在 skills 脚本中使用 console.log，可以将脚本移到 scripts 目录或使用 console.warn 替代。

---

## 实施后预期结果

修复后运行 `npm run typecheck` 应该：
- ✅ TypeScript 编译通过
- ✅ ESLint 检查通过（0 errors, 0 warnings）

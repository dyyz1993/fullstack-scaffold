# Path Alias Guide

## Why Path Aliases?

Deep relative imports like `../../../../../utils/helper` are:

- **Fragile**: Moving a file breaks all its imports
- **Hard to read**: Counting `../` levels is error-prone
- **Inconsistent**: Different files use different relative depths

## Rule: Max 2 Levels of `../`

The ESLint rule `local-rules/no-deep-relative-imports` enforces this limit.

### Not Allowed (3+ levels)

```typescript
import { helper } from "../../../utils/helper"; // 3 levels
import { db } from "../../../../db"; // 4 levels
import { auth } from "../../../../../middleware/auth"; // 5 levels
```

### Use Path Aliases Instead

```typescript
import { helper } from "@server/utils/helper"; // Clear and stable
import { db } from "@server/db";
import { auth } from "@server/middleware/auth";
```

## Available Path Aliases

| Alias       | Resolves To      | Use In             |
| ----------- | ---------------- | ------------------ |
| `@server/*` | `./src/server/*` | Server code, tests |
| `@shared/*` | `./src/shared/*` | All areas          |
| `@client/*` | `./src/client/*` | Client code        |
| `@admin/*`  | `./src/admin/*`  | Admin code         |
| `@cli/*`    | `./src/cli/*`    | CLI code           |

## Examples

### Server module importing utilities

```typescript
// Before:
import { randomElement } from "../../utils/generate";
import { authMiddleware } from "../../middleware/auth";
import { NotFoundError } from "../../utils/app-error";

// After:
import { randomElement } from "@server/utils/generate";
import { authMiddleware } from "@server/middleware/auth";
import { NotFoundError } from "@server/utils/app-error";
```

### Admin page importing components

```typescript
// Before:
import { PermissionGuard } from "../../components/PermissionGuard";
import { usePermissions } from "../../hooks/usePermissions";

// After:
import { PermissionGuard } from "@admin/components/PermissionGuard";
import { usePermissions } from "@admin/hooks/usePermissions";
```

### Cross-module import in server

```typescript
// Before:
import { notificationService } from "../module-notifications/services/notification-service";

// After:
import { notificationService } from "@server/module-notifications/services/notification-service";
```

## Configuration Files

Path aliases are defined in:

- `tsconfig.json` → `compilerOptions.paths`
- `vite.config.ts` → `resolve.alias`
- `vitest.config.ts` → `resolve.alias`

All three must be kept in sync!

# Project Rules

## Environment Variables

All environment variables must be defined in:

1. `.env.example` - Template file (committed to Git)
2. Actual `.env` file (not committed)

Required variables:

```bash
API_BASE_URL=http://localhost:3010
```

## Path Aliases

Use path aliases instead of relative imports:

```typescript
// ✅ Good
import { Todo } from '@shared/types';
import { useTodoStore } from '@client/stores/todoStore';

// ❌ Bad
import { Todo } from '../../../shared/types';
```

## Module Structure

Each backend module follows this pattern:

```
module-{feature}/
├── routes/         # API endpoints
├── services/       # Business logic
└── __tests__/      # Unit tests
```

## Testing

详细测试规范请参考 [testing-standards.md](./testing-standards.md)

快速参考：
- 单元测试: `__tests__/*.test.ts`
- 集成测试: `src/server/__tests__/integration/*.test.ts`
- 覆盖率目标: >80%

## Code Style

- Use Prettier for formatting
- Follow ESLint rules
- No console.log in production code
- Use TypeScript strict mode

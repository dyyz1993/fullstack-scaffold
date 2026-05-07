# 统一 Sessions 路径管理方案

## 问题分析

当前 sessions 路径在多个服务中分散定义，存在以下问题：

1. **路径分散**：5 个服务文件各自定义 `getProjectRoot()` 和 sessions 路径
2. **容易出错**：修改路径时需要同时修改多处，容易遗漏
3. **历史数据加载失败**：路径不一致可能导致读取不到正确的 sessions

### 当前涉及的文件

| 文件 | 用途 |
|------|------|
| `llm-service.ts` | 创建/写入 session |
| `session-parser.ts` | 读取/解析 session |
| `agent-service.ts` | 清除消息时删除 session |
| `workspace-service.ts` | 创建 workspace 时创建 sessions 目录 |
| `file-service.ts` | 获取文件时创建 sessions 目录 |

## 解决方案：创建统一路径管理模块

### 1. 创建 `paths.ts` 模块

```typescript
// src/server/module-agent/services/paths.ts
import path from 'path'
import { fileURLToPath } from 'url'

function getProjectRoot(): string {
  if (process.env.NODE_ENV === 'production') {
    return process.cwd()
  }
  const currentFile = fileURLToPath(import.meta.url)
  const currentDir = path.dirname(currentFile)
  return path.resolve(currentDir, '../../../../..')
}

export const Paths = {
  getProjectRoot,
  
  workspace(userId: string): string {
    return path.join(getProjectRoot(), '.workspaces', userId)
  },
  
  sessions(userId: string): string {
    return path.join(getProjectRoot(), '.sessions', userId)
  },
  
  sessionFile(userId: string, filename: string): string {
    return path.join(this.sessions(userId), filename)
  },
}
```

### 2. 重构各服务使用统一模块

每个服务改为：
```typescript
import { Paths } from './paths'

// 替换
const sessionDir = path.join(projectRoot, '.sessions', userId)
// 为
const sessionDir = Paths.sessions(userId)
```

### 3. 需要修改的文件

1. **创建新文件**
   - `src/server/module-agent/services/paths.ts`

2. **修改现有文件**
   - `llm-service.ts` - 使用 `Paths.sessions(userId)`
   - `session-parser.ts` - 使用 `Paths.sessions(userId)`
   - `agent-service.ts` - 使用 `Paths.sessions(userId)`
   - `workspace-service.ts` - 使用 `Paths.workspace(userId)` 和 `Paths.sessions(userId)`
   - `file-service.ts` - 使用 `Paths.workspace(userId)` 和 `Paths.sessions(userId)`

## 实施步骤

1. 创建 `paths.ts` 统一路径管理模块
2. 修改 `llm-service.ts` 使用 Paths
3. 修改 `session-parser.ts` 使用 Paths
4. 修改 `agent-service.ts` 使用 Paths
5. 修改 `workspace-service.ts` 使用 Paths
6. 修改 `file-service.ts` 使用 Paths
7. 运行类型检查验证
8. 测试历史数据加载

## 目录结构（最终）

```
{projectRoot}/
├── .workspaces/{userId}/     # 用户工作空间
│   └── *.py, *.ts, etc.
└── .sessions/{userId}/       # 会话记录
    └── *.jsonl
```

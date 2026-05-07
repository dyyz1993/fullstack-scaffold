# 测试结果追踪系统实施计划

## 需求分析

用户需要一个测试结果追踪系统，能够：

1. **记录测试结果**：保存每条测试用例的通过/失败状态
2. **关联 commit 版本**：将测试结果与当前 commit SHA 绑定
3. **历史记录存储**：持久化到指定目录，便于后续查询
4. **版本对比/回滚验证**：支持查看历史记录，对比不同版本的测试结果

## 关键设计决策

### 触发时机：Commit 成功后

**原因**：

* 暂存时也会运行测试，但此时还没有 commit，不应该记录

* 只有 commit 成功后才有确定的 commit SHA

* 避免记录未提交的测试结果

**实现方式**：

* 使用 Husky 的 `post-commit` hook

* 在 commit 成功后自动运行测试并记录结果

## 技术方案

### 数据结构设计

```typescript
interface TestCaseResult {
  name: string;           // 测试用例名称
  file: string;           // 测试文件路径
  status: 'passed' | 'failed' | 'skipped';
  duration: number;       // 执行时间(ms)
  error?: string;         // 失败时的错误信息
}

interface TestRunRecord {
  timestamp: string;      // ISO 时间戳
  commitSha: string;      // Git commit SHA
  shortSha: string;       // 短 SHA（前7位）
  commitMessage: string;  // Git commit message
  author: string;         // 提交者
  branch: string;         // 当前分支
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;       // 总执行时间(ms)
  testResults: TestCaseResult[];
  environment: {
    nodeVersion: string;
    platform: string;
  };
}

interface TestHistoryIndex {
  lastUpdated: string;
  totalRuns: number;
  runs: Array<{
    timestamp: string;
    commitSha: string;
    shortSha: string;
    commitMessage: string;
    branch: string;
    passed: number;
    failed: number;
    total: number;
  }>;
}
```

### 文件存储结构

```
.test-history/
├── index.json           # 索引文件，快速查看所有记录
├── runs/
│   ├── abc1234.json     # 按 commit SHA 命名（一个 commit 一个文件）
│   ├── def5678.json
│   └── ...
└── latest.json          # 最新一次测试结果（便于快速访问）
```

## 实施步骤

### Step 1: 创建测试结果追踪核心模块

**文件**: `template/scripts/test-tracker.ts`

功能：

* 定义数据类型接口

* 获取 Git 信息（commit SHA、分支、message、author）

* 运行测试并捕获 JSON 输出

* 解析测试结果

* 生成并保存测试记录到 `.test-history/`

* 更新索引文件

### Step 2: 创建查询/对比脚本

**文件**: `template/scripts/test-history.ts`

命令：

* `test-history list` - 列出所有历史记录

* `test-history show [sha]` - 显示指定版本（默认最新）的测试结果

* `test-history compare <sha1> <sha2>` - 对比两个版本的测试差异

* `test-history diff <sha>` - 对比当前工作区与指定版本的差异

* `test-history failed` - 显示所有失败的测试用例历史

### Step 3: 创建 post-commit hook 脚本

**文件**: `template/scripts/post-commit-track.ts`

流程：

1. 获取当前 commit 信息
2. 运行全量测试（或智能测试）
3. 保存测试结果到 `.test-history/`
4. 输出简要报告

### Step 4: 配置 Husky post-commit hook

**文件**: `template/.husky/post-commit`

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "📝 Tracking test results for this commit..."
node --import tsx/esm scripts/post-commit-track.ts
```

### Step 5: 添加 npm scripts

在 `template/package.json` 添加：

```json
{
  "scripts": {
    "test:track": "node --import tsx/esm scripts/test-tracker.ts",
    "test:history": "node --import tsx/esm scripts/test-history.ts",
    "test:history:list": "node --import tsx/esm scripts/test-history.ts list",
    "test:history:show": "node --import tsx/esm scripts/test-history.ts show",
    "test:history:compare": "node --import tsx/esm scripts/test-history.ts compare"
  }
}
```

### Step 6: 更新 .gitignore

在 `template/.gitignore` 添加：

```
# Test history (可选提交到仓库供团队共享)
.test-history/
```

## 工作流程

### 正常开发流程

```
1. 开发者修改代码
2. git add . (暂存)
3. git commit -m "feat: add new feature"
   ├── pre-commit hook 运行 → 类型检查 + lint + 智能测试
   ├── commit 成功
   └── post-commit hook 运行 → 运行测试并保存结果到 .test-history/
4. 测试结果已记录，关联到这个 commit
```

### 查询历史记录

```bash
# 查看所有历史记录
npm run test:history:list

# 查看最新 commit 的测试结果
npm run test:history:show

# 查看特定 commit 的测试结果
npm run test:history:show abc1234

# 对比两个版本
npm run test:history:compare abc1234 def5678
```

## 使用示例

### 1. Commit 后自动追踪

```bash
git commit -m "feat: add user authentication"
```

输出：

```
[main abc1234] feat: add user authentication
 2 files changed, 50 insertions(+)
📝 Tracking test results for this commit...
🔍 Running tests...
✅ Tests passed: 15/15 (2.3s)
📊 Results saved to .test-history/runs/abc1234.json
```

### 2. 查看历史记录

```bash
npm run test:history:list
```

输出：

```
📅 Test History (showing last 10 runs)

 Commit  | Branch  | Tests | Status  | Message                    | Time
---------|---------|-------|---------|----------------------------|------------------
 abc1234 | main    | 15/15 | ✅ Pass | feat: add user auth        | 2024-01-15 10:30
 def5678 | main    | 14/15 | ❌ Fail | fix: update todo service   | 2024-01-15 09:15
 ghi9012 | feature | 15/15 | ✅ Pass | feat: add notifications    | 2024-01-14 18:00
```

### 3. 对比版本差异

```bash
npm run test:history:compare abc1234 def5678
```

输出：

```
📊 Comparing test results:
  From: abc1234 "feat: add user auth" (2024-01-15 10:30)
  To:   def5678 "fix: update todo service" (2024-01-15 09:15)

📈 Summary:
  Tests: 15 → 14
  Passed: 15 → 14
  Failed: 0 → 1

✅ Fixed tests (now passing):
  (none)

❌ New failures:
  Todo Service > updateTodo > should update todo title and status
    Error: Expected status to be 'completed', got 'pending'
```

### 4. 回滚验证

```bash
# 怀疑某个 commit 引入了问题
git log --oneline -5
# abc1234 feat: add user auth
# def5678 fix: update todo service  ← 可能是这个
# ghi9012 feat: add notifications

# 查看这个 commit 的测试结果
npm run test:history:show def5678

# 对比这个 commit 和前一个 commit
npm run test:history:compare def5678 ghi9012

# 如果确认是这个 commit 的问题，回滚
git revert def5678
```

## 文件清单

| 文件                                      | 操作 | 说明                     |
| --------------------------------------- | -- | ---------------------- |
| `template/scripts/test-tracker.ts`      | 新建 | 核心追踪模块                 |
| `template/scripts/test-history.ts`      | 新建 | 历史查询脚本                 |
| `template/scripts/post-commit-track.ts` | 新建 | post-commit 执行脚本       |
| `template/.husky/post-commit`           | 新建 | Husky post-commit hook |
| `template/package.json`                 | 修改 | 添加 npm scripts         |
| `template/.gitignore`                   | 修改 | 添加 .test-history/      |

## 优势

1. **时机正确** - 只在 commit 成功后记录，确保关联正确的版本
2. **自动化** - 无需手动操作，commit 后自动追踪
3. **轻量级** - 不依赖外部服务，纯本地存储
4. **易于查询** - 提供丰富的查询和对比命令
5. **问题追溯** - 可以快速定位引入问题的 commit

## 可选配置

### 跳过追踪

如果某些 commit 不需要追踪测试结果：

```bash
git commit -m "docs: update readme" --no-verify
```

或者添加环境变量控制：

```bash
SKIP_TEST_TRACK=true git commit -m "docs: update readme"
```

### 只追踪特定分支

可以在 `post-commit-track.ts` 中添加分支过滤：

```typescript
const branch = getBranch();
if (branch !== 'main' && branch !== 'develop') {
  console.log('Skipping test tracking for feature branch');
  process.exit(0);
}
```

### 追踪全量测试 vs 智能测试

默认运行智能测试（更快），也可以配置运行全量测试：

```typescript
// 在 post-commit-track.ts 中
const runAllTests = process.env.TRACK_ALL_TESTS === 'true';
const command = runAllTests ? 'npx vitest run' : 'npm run test:smart';
```


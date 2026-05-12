# Phase 1: CLI 底层从 Commander.js 迁移到 xcli-core

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 create-biomimic-app 模板中的 CLI 从 Commander.js 迁移到 `@dyyz1993/xcli-core`，使生成的项目自带插件式 CLI 框架。

**Architecture:** 保留现有的 RPC 调用逻辑（hc client + auto-command），替换 CLI 注册/执行框架。每个 CLI 模块变为一个 xcli-core 插件，通过 `site.command()` 注册。脚手架生成器更新为生成 xcli-core 风格的 CLI 代码。

**Tech Stack:** @dyyz1993/xcli-core ^0.6.0, Zod, Hono RPC Client

---

## 背景知识

### xcli-core 核心概念

```typescript
import {
  Core,
  ok,
  fail,
  type CoreConfig,
  type CommandEntry,
  type CommandContext,
} from '@dyyz1993/xcli-core'

// 1. Core 是 CLI 入口
const app = new Core({
  name: 'my-cli',
  version: '1.0.0',
  description: 'My CLI tool',
  configDirName: '.my-cli',
  envPrefix: 'MY_CLI',
  pluginDirs: ['./plugins'],
})

// 2. 通过 loader API 注册命令（类似插件模式）
const site = app.loader.getAPI().createSite({
  name: 'builtin',
  url: 'http://localhost:3010',
})

// 3. site.command() 注册命令，参数用 Zod schema
site.command('list', {
  description: 'List all items',
  parameters: z.object({ limit: z.number().default(20) }),
  handler: async (params, ctx) => {
    // params 是经过 Zod 验证的对象
    // ctx 包含 storage, output, config 等
    return ok({ items: [] }, ['Found 0 items'])
  },
})

// 4. run() 执行
await app.run(process.argv.slice(2))
```

### xcli-core vs Commander.js 对比

| 概念         | Commander.js                 | xcli-core                                     |
| ------------ | ---------------------------- | --------------------------------------------- |
| 注册命令     | `program.command('x')`       | `site.command('x', config)`                   |
| 参数定义     | `.option('-l, --limit <n>')` | `parameters: z.object({ limit: z.number() })` |
| Handler 签名 | `async (options)`            | `async (params, ctx)`                         |
| 子命令       | `.command().subcommand()`    | 多个 `site.command()`                         |
| 插件         | 不支持                       | `pluginDirs` 自动加载                         |
| 配置         | 手动文件 I/O                 | `RcConfig` 内置                               |
| 帮助         | 自动生成                     | `HelpGenerator` 从 Zod 生成                   |

### 项目路径说明

- `/Users/xuyingzhou/Project/create-biomimic-app/template/` — 模板目录，生成时会被复制到用户项目
- `/Users/xuyingzhou/Project/create-biomimic-app/src/generators/` — 代码生成器，生成聚合文件
- `/Users/xuyingzhou/Project/create-biomimic-app/src/commands/create.ts` — 脚手架主命令

**所有模板文件的修改都在 `template/` 目录下。**

---

## Task 1: 添加 xcli-core 依赖

**Files:**

- Modify: `template/package.json` — dependencies 部分

**Step 1: 在 template/package.json 中添加依赖**

在 `dependencies` 对象中添加：

```json
"@dyyz1993/xcli-core": "^0.6.0"
```

同时删除 `"commander": "^14.0.3"` 依赖（CLI 不再直接使用 commander）。

**Step 2: 验证**

Run: `cd /Users/xuyingzhou/Project/create-biomimic-app/template && npm install`
Expected: 成功安装

**Step 3: Commit**

```bash
cd /Users/xuyingzhou/Project/create-biomimic-app
git add template/package.json template/pnpm-lock.yaml
git commit -m "feat: add xcli-core dependency to template"
```

---

## Task 2: 创建 CLI 入口文件（替换 Commander.js）

**Files:**

- Rewrite: `template/src/cli/index.ts`

**Step 1: 重写 CLI 入口**

将 `template/src/cli/index.ts` 从 Commander.js 改为 xcli-core：

```typescript
import { Core, type CoreConfig } from '@dyyz1993/xcli-core'
import { registerBuiltinCommands } from './modules'

const coreConfig: CoreConfig = {
  name: 'biomimic',
  version: '0.1.0',
  description: 'Biomimic CLI - RPC service & code generation tools',
  configDirName: '.biomimic',
  envPrefix: 'BIOMIMIC',
  pluginDirs: [],
}

const app = new Core(coreConfig)

// 注册内置命令（todo/notification/config 模块）
registerBuiltinCommands(app)

// 执行 CLI
const exitCode = await app.run(process.argv.slice(2))
process.exit(exitCode)
```

**注意：** `registerBuiltinCommands` 接收 `Core` 实例，从中获取 loader API 来注册命令。

**Step 2: Commit**

```bash
git add template/src/cli/index.ts
git commit -m "refactor: replace commander with xcli-core in CLI entry"
```

---

## Task 3: 重写 CLI 模块注册入口

**Files:**

- Rewrite: `template/src/cli/modules/index.ts`

**Step 1: 重写模块注册入口**

从 Commander.js 的 `Command` 类型改为 xcli-core 的 `Core` 类型：

```typescript
import type { Core } from '@dyyz1993/xcli-core'
import { registerTodoCommands } from './todo'
import { registerNotificationCommands } from './notification'
import { registerConfigCommands } from './config'

/**
 * 注册所有内置 CLI 命令到 xcli-core
 * 每个 register 函数通过 app.loader.getAPI() 获取插件 API
 */
export function registerBuiltinCommands(app: Core) {
  const api = app.loader.getAPI()

  // 创建一个内置 site，代表本地服务
  const site = api.createSite({
    name: 'local-server',
    url: 'http://localhost:3010',
  })

  registerTodoCommands(site)
  registerNotificationCommands(site)
  registerConfigCommands(site)
}

export { registerTodoCommands, registerNotificationCommands, registerConfigCommands }
```

**关键变化：**

- 不再传 `program: Command`，而是传 `site: SiteInstance`
- 每个 register 函数在 site 上注册 command
- `SiteInstance` 类似于一个命名空间，把相关命令分组

**Step 2: Commit**

```bash
git add template/src/cli/modules/index.ts
git commit -m "refactor: CLI module registration uses xcli-core SiteInstance"
```

---

## Task 4: 重写 todo CLI 模块

**Files:**

- Rewrite: `template/src/cli/modules/todo/index.ts`

**Step 1: 从 Commander.js 格式改为 xcli-core 格式**

原代码用 `RouteConfig[]` + `registerAutoCommand()` 自动生成 commander 命令。
新代码直接用 `site.command()` + Zod parameters 注册。

```typescript
import type { SiteInstance } from '@dyyz1993/xcli-core'
import { ok, fail } from '@dyyz1993/xcli-core'
import { z } from '@hono/zod-openapi'
import { getClient } from '@cli/utils/api'

export function registerTodoCommands(site: SiteInstance) {
  site.command('list', {
    description: 'List all todos',
    parameters: z.object({
      limit: z.coerce.number().default(20).describe('Limit results'),
    }),
    handler: async params => {
      try {
        const client = getClient()
        const res = await client.api.todos.$get()
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to list todos')
      }
    },
  })

  site.command('get', {
    description: 'Get a todo by ID',
    parameters: z.object({
      id: z.string().describe('Todo ID'),
    }),
    handler: async params => {
      try {
        const client = getClient()
        const res = await client.api.todos[':id'].$get({ param: { id: params.id } })
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to get todo')
      }
    },
  })

  site.command('create', {
    description: 'Create a new todo',
    parameters: z.object({
      title: z.string().min(1).describe('Todo title'),
      description: z.string().optional().describe('Todo description'),
    }),
    handler: async params => {
      try {
        const client = getClient()
        const res = await client.api.todos.$post({ json: params })
        const data = await res.json()
        return ok(data, ['Todo created'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to create todo')
      }
    },
  })

  site.command('update', {
    description: 'Update a todo',
    parameters: z.object({
      id: z.string().describe('Todo ID'),
      title: z.string().optional().describe('New title'),
      description: z.string().optional().describe('New description'),
      status: z.enum(['pending', 'in_progress', 'completed']).optional().describe('New status'),
    }),
    handler: async params => {
      try {
        const { id, ...body } = params
        const client = getClient()
        const res = await client.api.todos[':id'].$put({
          param: { id },
          json: body,
        })
        const data = await res.json()
        return ok(data, ['Todo updated'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to update todo')
      }
    },
  })

  site.command('delete', {
    description: 'Delete a todo',
    parameters: z.object({
      id: z.string().describe('Todo ID'),
    }),
    handler: async params => {
      try {
        const client = getClient()
        const res = await client.api.todos[':id'].$delete({ param: { id: params.id } })
        const data = await res.json()
        return ok(data, ['Todo deleted'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to delete todo')
      }
    },
  })
}
```

**关键变化：**

- `registerTodoCommands(program: Command)` → `registerTodoCommands(site: SiteInstance)`
- `RouteConfig[]` + `registerAutoCommand()` → 直接 `site.command(name, config)`
- Zod schema 同时定义参数验证和 CLI 帮助文档
- 返回 `ok(data)` 或 `fail(message)` 统一结果格式

**Step 2: Commit**

```bash
git add template/src/cli/modules/todo/index.ts
git commit -m "refactor: todo CLI module uses xcli-core site.command()"
```

---

## Task 5: 重写 notification CLI 模块

**Files:**

- Rewrite: `template/src/cli/modules/notification/index.ts`

**Step 1: 改为 xcli-core 格式**

```typescript
import type { SiteInstance } from '@dyyz1993/xcli-core'
import { ok, fail } from '@dyyz1993/xcli-core'
import { z } from '@hono/zod-openapi'
import { getClient } from '@cli/utils/api'

export function registerNotificationCommands(site: SiteInstance) {
  site.command('list', {
    description: 'List all notifications',
    parameters: z.object({
      'unread-only': z.boolean().default(false).describe('Show only unread'),
      limit: z.coerce.number().default(20).describe('Limit results'),
    }),
    handler: async params => {
      try {
        const client = getClient()
        const res = await client.api.notifications.$get({
          query: { unreadOnly: String(params['unread-only']), limit: String(params.limit) },
        })
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to list notifications')
      }
    },
  })

  site.command('create', {
    description: 'Create a new notification',
    parameters: z.object({
      title: z.string().min(1).describe('Notification title'),
      message: z.string().min(1).describe('Notification message'),
      type: z.enum(['info', 'warning', 'success', 'error']).default('info').describe('Type'),
    }),
    handler: async params => {
      try {
        const client = getClient()
        const res = await client.api.notifications.$post({ json: params })
        const data = await res.json()
        return ok(data, ['Notification created'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to create notification')
      }
    },
  })

  site.command('unread-count', {
    description: 'Get unread notification count',
    parameters: z.object({}),
    handler: async () => {
      try {
        const client = getClient()
        const res = await client.api.notifications['unread-count'].$get()
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to get unread count')
      }
    },
  })

  site.command('mark-read', {
    description: 'Mark a notification as read',
    parameters: z.object({
      id: z.string().describe('Notification ID'),
    }),
    handler: async params => {
      try {
        const client = getClient()
        const res = await client.api.notifications[':id'].read.$patch({ param: { id: params.id } })
        const data = await res.json()
        return ok(data, ['Marked as read'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to mark as read')
      }
    },
  })

  site.command('delete', {
    description: 'Delete a notification',
    parameters: z.object({
      id: z.string().describe('Notification ID'),
    }),
    handler: async params => {
      try {
        const client = getClient()
        const res = await client.api.notifications[':id'].$delete({ param: { id: params.id } })
        const data = await res.json()
        return ok(data, ['Notification deleted'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to delete notification')
      }
    },
  })
}
```

**Step 2: Commit**

```bash
git add template/src/cli/modules/notification/index.ts
git commit -m "refactor: notification CLI module uses xcli-core site.command()"
```

---

## Task 6: 重写 config CLI 模块

**Files:**

- Rewrite: `template/src/cli/modules/config/index.ts`

**Step 1: 改为 xcli-core 格式**

```typescript
import type { SiteInstance } from '@dyyz1993/xcli-core'
import { ok, fail } from '@dyyz1993/xcli-core'
import { z } from '@hono/zod-openapi'
import { getBaseUrl, setBaseUrl, getClient } from '@cli/utils/api'
import fs from 'fs'
import path from 'path'
import os from 'os'

const CONFIG_DIR = path.join(os.homedir(), '.biomimic')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

interface Config {
  baseUrl: string
  stats?: {
    totalCalls: number
    lastCallAt?: string
    commands?: Record<string, number>
  }
  [key: string]: string | number | boolean | undefined | Config['stats']
}

function loadConfig(): Config {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8')
      return JSON.parse(content)
    }
  } catch {
    // ignore
  }
  return { baseUrl: 'http://localhost:3010' }
}

function saveConfig(config: Config) {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
}

export function registerConfigCommands(site: SiteInstance) {
  site.command('config-get', {
    description: 'Show current configuration',
    parameters: z.object({
      key: z.string().optional().describe('Get specific config key'),
    }),
    handler: async params => {
      const cfg = loadConfig()
      if (params.key) {
        const value = cfg[params.key]
        return ok({ [params.key]: value ?? 'not set' })
      }
      return ok(cfg)
    },
  })

  site.command('config-set', {
    description: 'Set configuration value',
    parameters: z.object({
      url: z.string().optional().describe('Set server URL'),
    }),
    handler: async params => {
      const cfg = loadConfig()
      if (params.url) {
        cfg.baseUrl = params.url
        setBaseUrl(params.url)
      }
      saveConfig(cfg)
      return ok(cfg, [`Configuration saved`])
    },
  })

  site.command('config-url', {
    description: 'Show or set server URL',
    parameters: z.object({
      url: z.string().optional().describe('New server URL'),
    }),
    handler: async params => {
      if (params.url) {
        const cfg = loadConfig()
        cfg.baseUrl = params.url
        setBaseUrl(params.url)
        saveConfig(cfg)
        return ok({ url: params.url }, [`Server URL set to: ${params.url}`])
      }
      return ok({ url: getBaseUrl() })
    },
  })

  site.command('config-status', {
    description: 'Check server connection status',
    parameters: z.object({}),
    handler: async () => {
      try {
        const client = getClient()
        type HealthClient = { health: { $get: () => Promise<Response> } }
        const res = await (client as unknown as HealthClient).health.$get()
        const data = await res.json()
        return ok(data, ['Server is reachable'])
      } catch (error) {
        return fail(`Server not reachable: ${getBaseUrl()} - ${String(error)}`)
      }
    },
  })

  site.command('config-reset', {
    description: 'Reset configuration to defaults',
    parameters: z.object({}),
    handler: async () => {
      const defaultConfig: Config = { baseUrl: 'http://localhost:3010' }
      saveConfig(defaultConfig)
      setBaseUrl(defaultConfig.baseUrl)
      return ok(defaultConfig, ['Configuration reset to defaults'])
    },
  })

  site.command('config-path', {
    description: 'Show config file path',
    parameters: z.object({}),
    handler: async () => {
      return ok({ path: CONFIG_FILE })
    },
  })
}

export { loadConfig, saveConfig, CONFIG_FILE }
```

**注意：** xcli-core 不支持子命令嵌套（如 `config get`），所以命令名用连字符：`config-get`, `config-set` 等。这是 xcli-core 的扁平命令模型。后续阶段可以通过 Scope 系统实现层级命令。

**Step 2: Commit**

```bash
git add template/src/cli/modules/config/index.ts
git commit -m "refactor: config CLI module uses xcli-core site.command()"
```

---

## Task 7: 保留 RPC client 和 utils（不改动）

**Files:**

- Keep: `template/src/cli/rpc/client.ts`
- Keep: `template/src/cli/utils/api.ts`
- Keep: `template/src/cli/utils/logger.ts`
- Keep: `template/src/cli/utils/auto-command.ts`

**说明：** 这些文件是基础设施，与 CLI 框架无关：

- `rpc/client.ts` — Hono RPC 客户端，`getClient()` 函数不变
- `utils/api.ts` — baseUrl 管理，不变
- `utils/logger.ts` — 日志工具，不变（xcli-core 有 OutputFormatter 但暂不替换，降低迁移风险）
- `utils/auto-command.ts` — 保留给后续 RPC 自动映射阶段使用

**不修改，不提交。**

---

## Task 8: 更新 CLI 代码生成器

**Files:**

- Rewrite: `src/generators/cli-modules-index.ts`

**Step 1: 重写生成器**

从生成 Commander.js 风格的注册代码，改为生成 xcli-core 风格：

```typescript
import type { ResolvedPreset } from './template-generator'

export function generateCliModulesIndex(resolved: ResolvedPreset): string {
  const modules: string[] = []
  const registrations: string[] = []

  if (resolved.modules.has('todos')) {
    modules.push("import { registerTodoCommands } from './todo'")
    registrations.push('registerTodoCommands(site)')
  }

  if (resolved.modules.has('notifications')) {
    modules.push("import { registerNotificationCommands } from './notification'")
    registrations.push('registerNotificationCommands(site)')
  }

  modules.push("import { registerConfigCommands } from './config'")
  registrations.push('registerConfigCommands(site)')

  const exports = modules
    .map(m => {
      const match = m.match(/\{ (\w+) \}/)
      return match ? match[1] : ''
    })
    .filter(Boolean)

  return `import type { Core } from '@dyyz1993/xcli-core'
${modules.join('\n')}

export function registerBuiltinCommands(app: Core) {
  const api = app.loader.getAPI()
  const site = api.createSite({
    name: 'local-server',
    url: 'http://localhost:3010',
  })

${registrations.map(r => `  ${r}`).join('\n')}
}

export { ${exports.join(', ')} }
`
}
```

**关键变化：**

- `import type { Command } from 'commander'` → `import type { Core } from '@dyyz1993/xcli-core'`
- `registerModules(program: Command)` → `registerBuiltinCommands(app: Core)`
- 内部创建 `site` 并传给各模块注册函数
- `registerXxxCommands(program)` → `registerXxxCommands(site)`

**Step 2: Commit**

```bash
git add src/generators/cli-modules-index.ts
git commit -m "refactor: CLI generator outputs xcli-core format"
```

---

## Task 9: 更新脚手架入口 CLI（create-biomimic-app 自身）

**Files:**

- Modify: `src/cli/index.ts` — scaffold generator 自身的 CLI 入口

**说明：** 脚手架生成器自身的 CLI 入口（`src/cli/index.ts`）也使用 Commander.js。但这个入口只负责：

1. 接收项目名称和选项
2. 调用 `createProject()`

这个文件不生成到用户项目，仅用于 `create-fullstack-scaffold` 命令本身。

**决策：** 暂不迁移脚手架生成器自身的 CLI（风险大、收益低）。只迁移模板 CLI。

**不修改，不提交。**

---

## Task 10: 验证模板生成结果

**Step 1: 运行干跑测试**

```bash
cd /Users/xuyingzhou/Project/create-biomimic-app
npx tsx src/index.ts test-project /tmp/test-cli-migration --preset todo-app --dry-run
```

Expected: 无报错，显示将生成的文件列表。检查 `src/cli/` 下的文件是否正确生成。

**Step 2: 实际生成项目**

```bash
npx tsx src/index.ts test-cli-xcli /tmp/test-cli-migration --preset todo-app
```

Expected: 项目生成成功。

**Step 3: 安装依赖并验证**

```bash
cd /tmp/test-cli-migration
npm install
npx tsc --noEmit
```

Expected: TypeScript 零错误。

**Step 4: 测试 CLI 命令**

```bash
# 在生成项目目录下
node dist/cli/index.js --help
node dist/cli/index.js --version
node dist/cli/index.js todo --help
node dist/cli/index.js notification --help
node dist/cli/index.js config-status
```

Expected:

- `--help` 显示所有命令列表
- `--version` 显示版本号
- 子命令帮助正确显示参数
- `config-status` 报告服务器不可达（正常，因为没启动）

**Step 5: Commit**

```bash
cd /Users/xuyingzhou/Project/create-biomimic-app
git add -A
git commit -m "test: verify xcli-core migration with todo-app preset"
```

---

## Task 11: 验证其他 preset

**Step 1: 测试 minimal preset**

```bash
cd /Users/xuyingzhou/Project/create-biomimic-app
npx tsx src/index.ts test-minimal /tmp/test-minimal --preset minimal
cd /tmp/test-minimal
npm install
npx tsc --noEmit
```

Expected: 零错误，CLI 只有 todo + config 命令。

**Step 2: 测试 fullstack-admin preset**

```bash
cd /Users/xuyingzhou/Project/create-biomimic-app
npx tsx src/index.ts test-full /tmp/test-full --preset fullstack-admin
cd /tmp/test-full
npm install
npx tsc --noEmit
```

Expected: 零错误，CLI 有 todo + notification + config 命令。

**Step 3: 清理测试目录**

```bash
rm -rf /tmp/test-cli-migration /tmp/test-minimal /tmp/test-full
```

---

## 风险和回退方案

| 风险                                        | 影响                                  | 回退方案                                           |
| ------------------------------------------- | ------------------------------------- | -------------------------------------------------- |
| xcli-core `site.command()` 不支持嵌套子命令 | 用户看到 `todo-list` 而非 `todo list` | 后续用 Scope 系统解决，或贡献 PR 到 xcli-core      |
| xcli-core 参数解析与 Zod 版本不兼容         | 参数验证失败                          | 确认 xcli-core 使用的 Zod 版本，必要时 patch       |
| 生成项目 `npm run cli` 失败                 | CLI 构建出错                          | 检查 tsup.config.ts 是否包含 xcli-core 的 ESM 导出 |
| 现有测试断言 Commander 输出格式             | 测试失败                              | 更新测试用例为 xcli-core 输出格式                  |

## 后续阶段预览

- **Phase 2**: 在 `auto-command.ts` 中实现从 Hono 路由自动生成 xcli-core `site.command()` 注册
- **Phase 3**: 新增 marketplace/browser/cli-market preset
- **Phase 4**: SEO + Admin 适配

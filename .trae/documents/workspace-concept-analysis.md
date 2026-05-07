# 工作空间(Workspace)概念分析与实施计划

## 问题分析

### 当前架构存在的问题

通过分析 `/template/src/server/module-agent` 和 `/template/src/client/pages/ChatPage.tsx`，发现以下问题：

#### 1. 缺少工作空间隔离

**当前数据模型：**
```
User (用户)
  └── Agent (一对一)
        └── ChatMessages (对话消息)
```

**问题：**
- 一个用户只能有一个 Agent，所有对话混在一起
- 没有项目/工作空间的概念来隔离不同项目的对话
- 用户无法为不同项目创建独立的对话环境

#### 2. Sandbox 与数据模型脱节

[sandbox-bash.ts](file:///Users/xuyingzhou/Project/create-biomimic-app/template/src/server/module-agent/services/sandbox-bash.ts#L6-L9) 中有 `workspacePath` 参数：
```typescript
export interface SandboxOptions {
  workspacePath: string
  allowNetwork?: boolean
}
```

但这只是文件系统层面的工作空间，**没有对应的数据模型**来管理：
- 工作空间的元数据（名称、描述、创建时间等）
- 工作空间与 Agent 的关联
- 工作空间与用户的权限关系

#### 3. 会话存储路径问题

[agent-service.ts](file:///Users/xuyingzhou/Project/create-biomimic-app/template/src/server/module-agent/services/agent-service.ts#L159-L161) 中：
```typescript
const sessionDir = path.join(projectRoot, '.pi', 'sessions', userId)
```

会话按 `userId` 存储，而不是按工作空间存储，导致：
- 无法区分不同项目的对话历史
- 清空消息时会删除该用户所有会话文件

#### 4. 前端体验问题

[ChatPage.tsx](file:///Users/xuyingzhou/Project/create-biomimic-app/template/src/client/pages/ChatPage.tsx#L45-L99) 中：
- 左侧边栏只显示一个 Agent 信息
- 没有工作空间列表或切换功能
- 用户无法在不同项目间快速切换

---

## 解决方案

### 新的数据模型架构（简化版）

根据用户需求：
1. **一个用户一个工作空间**（一对一关系）
2. **工作空间与租户无关**
3. **自动管理文件路径**
4. **不需要向后兼容**

```
User (用户)
  └── Workspace (工作空间，一对一)
        ├── path (自动管理的文件系统路径)
        ├── settings (工作空间配置)
        └── Agents (多个 Agent)
              └── ChatMessages (对话消息)
```

### 核心改进点

#### 1. 数据库层面

**新增 `workspaces` 表：**
```typescript
export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  path: text('path').notNull(),           // 自动管理的路径：.workspaces/{userId}/
  userId: text('user_id').notNull().unique(), // 一对一：unique约束
  settings: text('settings', { mode: 'json' }), // 工作空间配置
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
})
```

**修改 `agents` 表：**
```typescript
export const agents = sqliteTable('agents', {
  // ... 现有字段
  workspaceId: text('workspace_id').notNull(), // 新增：关联工作空间
  // ...
})
```

**修改 `chatMessages` 表：**
```typescript
export const chatMessages = sqliteTable('chat_messages', {
  // ... 现有字段
  workspaceId: text('workspace_id').notNull(), // 新增：关联工作空间
  // ...
})
```

#### 2. 服务层面

**新增 `workspace-service.ts`：**
- `getOrCreateWorkspace(userId)` - 自动创建或获取用户的工作空间
- `getWorkspace(userId)` - 获取用户的工作空间
- `updateWorkspace(userId, input)` - 更新工作空间
- `deleteWorkspace(userId)` - 删除工作空间（慎用）

**修改 `agent-service.ts`：**
- `getOrCreateAgent(userId)` → `getOrCreateAgent(userId, workspaceId)` - 在工作空间下创建 Agent
- 会话存储路径改为：`.workspaces/{userId}/sessions/`

**修改 `chat-session-manager.ts`：**
- 在创建 LLM 服务时传入工作空间路径
- 使用工作空间路径初始化 Sandbox

#### 3. API 层面

**新增工作空间路由：**
- `GET /workspace` - 获取当前用户的工作空间
- `PUT /workspace` - 更新工作空间
- `DELETE /workspace` - 删除工作空间

**修改现有 Agent 路由：**
- `GET /agents` → `GET /workspace/agents` - 获取工作空间下的 Agent
- `POST /agents/:id/chat` → 保持不变，但内部使用工作空间

#### 4. 前端层面

**修改 `ChatPage.tsx`：**
- 左侧边栏顶部显示工作空间信息
- 显示工作空间路径
- 添加工作空间设置入口

**修改 `agentStore.ts`：**
- 添加 `workspaceId` 状态
- 获取 Agent 时关联工作空间

**新增 Store：**
- `useWorkspaceStore` - 管理工作空间状态

---

## 实施步骤

### 第一阶段：数据模型与后端 API

#### 步骤 1：创建数据库 Schema
- 创建 `workspaces` 表定义
- 修改 `agents` 表添加 `workspaceId` 字段
- 修改 `chatMessages` 表添加 `workspaceId` 字段
- 更新 schema 导出

#### 步骤 2：实现工作空间服务层
- 创建 `workspace-service.ts`
- 实现 `getOrCreateWorkspace` - 自动创建工作空间和目录
- 实现 `getWorkspace`、`updateWorkspace`、`deleteWorkspace`
- 实现自动路径管理逻辑

#### 步骤 3：创建工作空间路由
- 创建 `workspace-routes.ts`
- 实现 `GET /workspace` 端点
- 实现 `PUT /workspace` 端点
- 实现 `DELETE /workspace` 端点
- 添加 OpenAPI 文档

#### 步骤 4：修改现有 Agent 服务
- 修改 `agent-service.ts` 支持工作空间
- 修改 `getOrCreateAgent` 接受 `workspaceId`
- 修改会话存储路径逻辑
- 更新 `chat-session-manager.ts` 使用工作空间路径

#### 步骤 5：更新 Agent 路由
- 修改 `agent-routes.ts`
- 在获取 Agent 前先获取/创建工作空间
- 传递工作空间 ID 给 Agent 服务

### 第二阶段：前端实现

#### 步骤 6：创建工作空间 Store
- 创建 `useWorkspaceStore`
- 实现 `fetchWorkspace` 方法
- 实现 `updateWorkspace` 方法
- 与 Agent Store 集成

#### 步骤 7：修改 Agent Store
- 添加 `workspaceId` 状态
- 修改 `fetchAgent` 获取工作空间
- 更新相关方法

#### 步骤 8：修改 ChatPage
- 重构左侧边栏显示工作空间信息
- 显示工作空间名称和路径
- 添加工作空间设置按钮（可选）

#### 步骤 9：创建工作空间组件（可选）
- 创建 `WorkspaceInfo` 组件
- 创建 `WorkspaceSettings` 模态框

### 第三阶段：测试与优化

#### 步骤 10：编写测试
- 工作空间服务单元测试
- 工作空间路由集成测试
- Agent 服务测试更新
- 前端组件测试

#### 步骤 11：优化与完善
- 添加错误处理
- 优化性能
- 添加日志记录
- 完善文档

---

## 技术细节

### 自动路径管理

**路径结构：**
```
项目根目录/
  └── .workspaces/
        └── {userId}/
              ├── sessions/
              │     ├── session-xxx.jsonl
              │     └── ...
              ├── config.json
              └── ...
```

**自动创建逻辑：**
```typescript
async function getOrCreateWorkspace(userId: string): Promise<Workspace> {
  // 1. 查询数据库
  let workspace = await db.select().from(workspaces).where(eq(workspaces.userId, userId))
  
  if (workspace) return workspace
  
  // 2. 创建目录
  const workspacePath = path.join(projectRoot, '.workspaces', userId)
  const sessionsPath = path.join(workspacePath, 'sessions')
  await fs.mkdir(sessionsPath, { recursive: true })
  
  // 3. 创建数据库记录
  workspace = await db.insert(workspaces).values({
    id: generateId('workspace'),
    name: 'Default Workspace',
    path: workspacePath,
    userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  
  return workspace
}
```

### Sandbox 集成

**修改 `chat-session-manager.ts`：**
```typescript
async processChatMessage(agentId: string, userId: string, content: string) {
  // 获取工作空间
  const workspace = await getOrCreateWorkspace(userId)
  
  // 初始化 Sandbox
  await initializeSandbox({
    workspacePath: workspace.path,
    allowNetwork: false,
  })
  
  // ... 其他逻辑
}
```

---

## 文件清单

### 新增文件
1. `src/server/db/schema/workspaces.ts` - 工作空间表定义
2. `src/server/module-agent/services/workspace-service.ts` - 工作空间服务
3. `src/server/module-agent/routes/workspace-routes.ts` - 工作空间路由
4. `src/client/stores/workspaceStore.ts` - 工作空间状态管理
5. `src/client/components/WorkspaceInfo.tsx` - 工作空间信息组件（可选）

### 修改文件
1. `src/server/db/schema/agents.ts` - 添加 workspaceId 字段
2. `src/server/db/schema/index.ts` - 导出 workspaces
3. `src/server/module-agent/services/agent-service.ts` - 支持工作空间
4. `src/server/module-agent/services/chat-session-manager.ts` - 使用工作空间路径
5. `src/server/module-agent/routes/agent-routes.ts` - 集成工作空间
6. `src/server/module-agent/index.ts` - 导出工作空间路由
7. `src/client/stores/agentStore.ts` - 添加工作空间支持
8. `src/client/pages/ChatPage.tsx` - 显示工作空间信息

---

## 总结

**是的，当前架构确实缺少工作空间的概念。**

根据您的需求，我们采用最简化的设计：
- **一对一关系**：一个用户一个工作空间
- **自动管理**：系统自动创建和管理路径
- **无租户关联**：工作空间独立于租户系统
- **无需迁移**：直接实施新架构

这将解决：
1. Sandbox 的 workspacePath 有对应的数据模型
2. 会话按工作空间隔离存储
3. 前端可以显示工作空间信息
4. 为未来扩展（如多工作空间）预留空间

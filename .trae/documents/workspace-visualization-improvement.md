# 工作空间可视化改进计划

## 问题分析

### 当前实现的问题

通过分析 [ChatPage.tsx](file:///Users/xuyingzhou/Project/create-biomimic-app/template/src/client/pages/ChatPage.tsx)，发现以下问题：

#### 1. 展示方式简陋
- 工作空间只是左侧边栏的一个简单卡片
- 只显示名称、描述和路径文本
- 没有可视化文件结构

#### 2. 布局不合理
- 工作空间信息挤在左侧边栏
- 与 Agent 信息混在一起，层次不清晰
- 没有充分利用屏幕空间

#### 3. 缺少文件树展示
- 用户无法看到工作空间内的文件结构
- 不知道有哪些会话文件
- 无法快速浏览和管理文件

---

## 解决方案

### 新的布局设计

**改进前：**
```
┌──────────────────────────────────────┐
│  左侧边栏 (w-64)  │  聊天区域         │
│  - 工作空间卡片   │  - 消息列表       │
│  - Agent 信息     │  - 输入框         │
│  - 设置按钮       │                   │
└──────────────────────────────────────┘
```

**改进后：**
```
┌─────────────────────────────────────────────────────────┐
│  左侧 (w-64)  │  中间聊天区域  │  右侧工作空间 (w-80)   │
│  - Agent 信息  │  - 消息列表    │  📁 工作空间树状图    │
│  - 设置按钮    │  - 输入框      │    📁 sessions/       │
│               │                │      📄 xxx.jsonl     │
│               │                │    📁 config.json     │
│               │                │    📊 统计信息         │
└─────────────────────────────────────────────────────────┘
```

### 核心改进点

#### 1. 创建文件树组件
- 可视化展示工作空间目录结构
- 支持展开/折叠目录
- 显示文件类型图标
- 支持文件搜索

#### 2. 右侧工作空间面板
- 独立的工作空间展示区域
- 文件树 + 统计信息
- 操作按钮（刷新、搜索等）

#### 3. 三栏布局
- 左侧：Agent 信息和设置
- 中间：聊天区域
- 右侧：工作空间面板

---

## 实施步骤

### 第一阶段：文件系统 API

#### 步骤 1：创建文件服务
**文件：** `src/server/module-agent/services/file-service.ts`

**功能：**
- `getWorkspaceFiles(userId)` - 获取工作空间文件树
- `getFileContent(userId, filePath)` - 读取文件内容
- 文件过滤（忽略隐藏文件、临时文件等）

**实现要点：**
```typescript
interface FileNode {
  id: string
  name: string
  type: 'file' | 'directory'
  path: string
  size?: number
  modifiedAt?: string
  children?: FileNode[]
}
```

#### 步骤 2：创建文件路由
**文件：** `src/server/module-agent/routes/file-routes.ts`

**API 端点：**
- `GET /api/workspace/files` - 获取文件树
- `GET /api/workspace/files/:path` - 获取文件内容（可选）

### 第二阶段：前端组件

#### 步骤 3：创建树节点组件
**文件：** `src/client/components/TreeNode.tsx`

**功能：**
- 递归渲染树节点
- 展开/折叠动画
- 文件类型图标（使用 lucide-react）
- 选中高亮效果

**图标映射：**
- 📁 目录：`Folder` / `FolderOpen`
- 📄 文件：`File`
- 📝 JSON：`FileJson`
- 📊 数据：`FileBarChart`

#### 步骤 4：创建文件树组件
**文件：** `src/client/components/FileTree.tsx`

**功能：**
- 渲染完整的文件树
- 搜索过滤
- 全部展开/折叠
- 虚拟滚动（如果文件很多）

#### 步骤 5：创建工作空间面板
**文件：** `src/client/components/WorkspacePanel.tsx`

**结构：**
```
WorkspacePanel
├── Header (工作空间名称、描述)
├── Toolbar (刷新、搜索按钮)
├── FileTree (文件树)
└── Footer (统计信息)
```

**功能：**
- 显示工作空间信息
- 集成文件树组件
- 显示统计信息（文件数、总大小等）

#### 步骤 6：扩展工作空间 Store
**文件：** `src/client/stores/workspaceStore.ts`

**新增状态：**
- `files: FileNode[]` - 文件列表
- `loadingFiles: boolean` - 加载状态
- `searchQuery: string` - 搜索关键词

**新增方法：**
- `fetchFiles()` - 获取文件树
- `setSearchQuery()` - 设置搜索

### 第三阶段：布局调整

#### 步骤 7：修改 ChatPage 布局
**文件：** `src/client/pages/ChatPage.tsx`

**改动：**
1. 调整为三栏布局
2. 左侧边栏只保留 Agent 信息
3. 右侧添加工作空间面板
4. 调整宽度比例

**布局代码示例：**
```tsx
<div className="flex h-full">
  {/* 左侧 Agent 信息 */}
  <div className="w-64 bg-white border-r">
    {/* Agent 信息 */}
  </div>
  
  {/* 中间聊天区域 */}
  <div className="flex-1 flex flex-col">
    <ChatArea />
  </div>
  
  {/* 右侧工作空间面板 */}
  <div className="w-80 bg-white border-l">
    <WorkspacePanel />
  </div>
</div>
```

### 第四阶段：样式优化

#### 步骤 8：添加动画效果
- 目录展开/折叠动画
- 文件树加载骨架屏
- 搜索高亮动画

#### 步骤 9：响应式适配
- 小屏幕时右侧面板可折叠
- 文件树自适应高度

---

## 技术细节

### 文件树数据结构

```typescript
interface FileNode {
  id: string
  name: string
  type: 'file' | 'directory'
  path: string
  size?: number
  modifiedAt?: string
  children?: FileNode[]
  icon?: string
}
```

### 工作空间目录结构

```
.workspaces/{userId}/
├── sessions/
│   ├── session-xxx.jsonl
│   ├── session-yyy.jsonl
│   └── ...
├── config.json (可选)
└── ...
```

### API 响应格式

```typescript
// GET /api/workspace/files
{
  success: true,
  data: {
    root: FileNode,
    totalFiles: number,
    totalDirectories: number,
    totalSize: number
  }
}
```

---

## 文件清单

### 新增文件
1. `src/server/module-agent/services/file-service.ts` - 文件系统服务
2. `src/server/module-agent/routes/file-routes.ts` - 文件 API 路由
3. `src/client/components/TreeNode.tsx` - 树节点组件
4. `src/client/components/FileTree.tsx` - 文件树组件
5. `src/client/components/WorkspacePanel.tsx` - 工作空间面板

### 修改文件
1. `src/server/module-agent/index.ts` - 导出文件路由
2. `src/server/route-registry.ts` - 注册文件路由
3. `src/client/pages/ChatPage.tsx` - 调整为三栏布局
4. `src/client/stores/workspaceStore.ts` - 添加文件状态

---

## 关键决策点

### 决策 1：面板宽度

**选项 A：固定宽度（推荐）**
- 左侧：w-64 (256px)
- 右侧：w-80 (320px)
- 中间：flex-1
- 实现简单，布局稳定

**选项 B：可拖拽调整**
- 用户可自定义宽度
- 需要保存用户偏好
- 实现复杂度高

### 决策 2：文件操作功能

**选项 A：只读浏览（推荐初期实现）**
- 只显示文件结构
- 不支持编辑、删除
- 安全，实现简单

**选项 B：完整文件管理**
- 支持创建、编辑、删除
- 功能强大，但复杂
- 需要更多安全考虑

### 决策 3：文件内容预览

**选项 A：不预览（推荐初期实现）**
- 只显示文件树
- 实现简单

**选项 B：点击预览**
- 点击文件显示内容
- 需要文件内容 API
- 增加交互性

---

## 风险与注意事项

1. **文件系统权限**
   - 确保只能访问工作空间目录
   - 过滤敏感文件（.env 等）
   - 路径遍历攻击防护

2. **性能考虑**
   - 大量文件时的性能
   - 考虑虚拟滚动
   - 懒加载子目录

3. **用户体验**
   - 空状态展示
   - 加载状态
   - 错误处理

---

## 总结

**改进目标：**
1. ✅ 添加文件树可视化
2. ✅ 工作空间面板移到右侧
3. ✅ 三栏布局更清晰
4. ✅ 提升用户体验

**实施优先级：**
1. 高：文件系统 API + 文件树组件
2. 高：布局调整（三栏）
3. 中：样式优化和动画
4. 低：高级功能（文件预览、编辑等）

# 组件化与测试增强计划

## 项目现状分析

### Pages 目录 (`/template/src/client/pages/`)
- `TodoPage.tsx` - 已有完整实现和测试
- `NotificationPage.tsx` - 已有完整实现，**缺少测试**
- `WebSocketPage.tsx` - 已有完整实现，**缺少测试**

### Components 目录 (`/template/src/client/components/`)
- 仅包含 `__tests__/App.test.tsx`
- **没有独立的可复用组件**

### 测试覆盖情况
- ✅ App.test.tsx - 测试App组件
- ✅ todoStore.test.ts - 测试Todo store
- ❌ NotificationPage - 无测试
- ❌ WebSocketPage - 无测试

---

## 实施计划

### 第一阶段：提取可复用组件

从现有页面中提取公共UI组件到 `/template/src/client/components/` 目录：

#### 1. StatusBadge 组件
- **用途**: 显示状态徽章（用于Todo状态、通知类型、WebSocket消息类型等）
- **Props**: `type`, `icon`, `label`, `colorScheme`
- **来源**: TodoPage、NotificationPage、WebSocketPage 中的状态显示逻辑

#### 2. LoadingSpinner 组件
- **用途**: 统一的加载指示器
- **Props**: `size`, `color`, `className`
- **来源**: 多个页面中的 Loader2 图标

#### 3. EmptyState 组件
- **用途**: 空状态显示
- **Props**: `icon`, `title`, `description`
- **来源**: TodoPage、NotificationPage、WebSocketPage 中的空状态显示

#### 4. ConnectionStatus 组件
- **用途**: 显示连接状态（SSE/WebSocket）
- **Props**: `connected`, `status`, `onConnect`, `onDisconnect`
- **来源**: NotificationPage 和 WebSocketPage 的连接状态区域

#### 5. MessageCard 组件
- **用途**: 消息卡片显示（用于WebSocket消息）
- **Props**: `type`, `payload`, `timestamp`, `colorScheme`
- **来源**: WebSocketPage 中的消息显示

---

### 第二阶段：创建组件测试

为每个新组件创建测试文件：

| 组件 | 测试文件 | 测试内容 |
|------|----------|----------|
| StatusBadge | `StatusBadge.test.tsx` | 渲染、颜色、图标显示 |
| LoadingSpinner | `LoadingSpinner.test.tsx` | 渲染、尺寸、动画 |
| EmptyState | `EmptyState.test.tsx` | 渲染、图标、文本 |
| ConnectionStatus | `ConnectionStatus.test.tsx` | 状态切换、按钮交互 |
| MessageCard | `MessageCard.test.tsx` | 消息渲染、时间格式 |

---

### 第三阶段：创建页面测试

为缺少测试的页面创建测试文件：

#### 1. NotificationPage.test.tsx
测试内容：
- 初始渲染（标题、描述）
- SSE 连接状态显示
- 创建通知表单交互
- 通知列表渲染
- 标记已读功能
- 删除通知功能
- 空状态显示
- 错误状态显示

#### 2. WebSocketPage.test.tsx
测试内容：
- 初始渲染（标题、描述）
- 连接/断开按钮状态
- 消息类型选择
- 发送消息功能
- 消息列表渲染
- 清空消息功能
- 空状态显示
- 加载状态显示

---

### 第四阶段：重构现有页面

使用新组件重构现有页面，减少代码重复：

#### TodoPage.tsx
- 使用 StatusBadge 替换状态显示
- 使用 LoadingSpinner 替换加载指示器
- 使用 EmptyState 替换空状态显示

#### NotificationPage.tsx
- 使用 StatusBadge 替换类型徽章
- 使用 LoadingSpinner 替换加载指示器
- 使用 EmptyState 替换空状态显示
- 使用 ConnectionStatus 替换连接状态区域

#### WebSocketPage.tsx
- 使用 StatusBadge 替换消息类型徽章
- 使用 LoadingSpinner 替换加载指示器
- 使用 EmptyState 替换空状态显示
- 使用 ConnectionStatus 替换连接状态区域
- 使用 MessageCard 替换消息卡片

---

## 文件结构

```
template/src/client/
├── components/
│   ├── __tests__/
│   │   ├── App.test.tsx (已存在)
│   │   ├── StatusBadge.test.tsx (新增)
│   │   ├── LoadingSpinner.test.tsx (新增)
│   │   ├── EmptyState.test.tsx (新增)
│   │   ├── ConnectionStatus.test.tsx (新增)
│   │   └── MessageCard.test.tsx (新增)
│   ├── StatusBadge.tsx (新增)
│   ├── LoadingSpinner.tsx (新增)
│   ├── EmptyState.tsx (新增)
│   ├── ConnectionStatus.tsx (新增)
│   ├── MessageCard.tsx (新增)
│   └── index.ts (新增 - 导出所有组件)
├── pages/
│   ├── __tests__/
│   │   ├── NotificationPage.test.tsx (新增)
│   │   └── WebSocketPage.test.tsx (新增)
│   ├── NotificationPage.tsx (重构)
│   ├── TodoPage.tsx (重构)
│   └── WebSocketPage.tsx (重构)
```

---

## 实施步骤

1. **创建组件目录结构**
   - 创建 `pages/__tests__` 目录

2. **实现组件** (按顺序)
   - StatusBadge.tsx
   - LoadingSpinner.tsx
   - EmptyState.tsx
   - ConnectionStatus.tsx
   - MessageCard.tsx
   - index.ts

3. **实现组件测试** (按顺序)
   - StatusBadge.test.tsx
   - LoadingSpinner.test.tsx
   - EmptyState.test.tsx
   - ConnectionStatus.test.tsx
   - MessageCard.test.tsx

4. **实现页面测试** (按顺序)
   - NotificationPage.test.tsx
   - WebSocketPage.test.tsx

5. **重构页面** (按顺序)
   - TodoPage.tsx
   - NotificationPage.tsx
   - WebSocketPage.tsx

6. **验证**
   - 运行所有测试确保通过
   - 运行类型检查确保无错误

---

## 预期成果

1. **组件化**: 5个可复用的UI组件
2. **测试覆盖**: 新增7个测试文件
3. **代码质量**: 减少重复代码，提高可维护性
4. **一致性**: 统一的UI风格和交互体验

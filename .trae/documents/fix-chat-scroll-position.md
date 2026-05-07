# ChatPage 消息列表滚动位置偏移问题修复计划

## 问题描述
当用户在 ChatPage 中点击文件打开预览时，`MessageList` 组件会被卸载（unmount）。关闭预览后，`MessageList` 重新挂载，此时滚动位置会丢失，回到顶部而不是保持原来的位置。

## 问题根因分析

**问题代码位置**: `src/client/pages/ChatPage.tsx`

```tsx
// ChatArea.tsx 第 44-57 行
{selectedFile ? (
  <div className="flex-1 overflow-hidden">
    <FilePreview file={selectedFile} onClose={handleClosePreview} />
  </div>
) : (
  <MessageList
    ref={containerRef}
    rounds={rounds}
    ...
  />
)}
```

**问题原因**:
1. `MessageList` 使用 `forwardRef` 和 `useScrollLoading` hook 来管理滚动容器
2. 当 `selectedFile` 存在时，`MessageList` 完全卸载（unmount）
3. 当关闭预览时，`MessageList` 重新挂载，但滚动位置丢失（浏览器自然滚动位置会重置）

## 修复方案

保持 `MessageList` 组件始终挂载，只通过 CSS 控制显示/隐藏。这样可以：
- 保留滚动位置
- 避免复杂的滚动位置保存/恢复逻辑

### 修改文件

**文件**: `src/client/components/ChatArea.tsx`

**修改内容**:
将条件渲染改为始终渲染 `MessageList`，通过 CSS 类控制可见性

```tsx
// 修改前
{selectedFile ? (
  <div className="flex-1 overflow-hidden">
    <FilePreview file={selectedFile} onClose={handleClosePreview} />
  </div>
) : (
  <MessageList ... />
)}

// 修改后
<div className={`flex-1 overflow-hidden ${selectedFile ? 'hidden' : ''}`}>
  <MessageList ... />
</div>
<div className={`flex-1 overflow-hidden ${selectedFile ? '' : 'hidden'}`}>
  <FilePreview file={selectedFile} onClose={handleClosePreview} />
</div>
```

## 实现步骤

1. 修改 `ChatArea.tsx` 的 JSX 结构
2. 使用 CSS `hidden` 类来控制组件的显示/隐藏
3. 验证功能正常 - 打开/关闭文件预览后，消息列表滚动位置保持不变

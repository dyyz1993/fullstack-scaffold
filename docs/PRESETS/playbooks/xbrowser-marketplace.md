# XBrowser Marketplace — Test Playbook

> 站点：https://market.lpm1.top
> 身份数：4
> 每个身份列出：操作步骤 → 验证 → 截图 → 选择器

---

## 平台管理员

**凭据**: `superadmin / 123456`

**案例数**: 3

### 登录管理后台

**步骤**:

1. 打开 /admin
2. 输入 superadmin / 123456
3. 点击登录

**验证**: 进入管理后台

### 插件审核（approve/reject）

**步骤**:

1. 进入插件管理页
2. 查看待审核列表
3. 点击 approve 或 reject

**验证**: 插件状态变更

### 插件上架/下架

**步骤**:

1. 进入插件管理页
2. 操作上架/下架按钮

**验证**: 插件可见性变更

---

## 开发者

**凭据**: `注册后登录`

**案例数**: 3

### 注册开发者账号

**步骤**:

1. 打开注册页
2. 填写用户名/邮箱/密码
3. 提交

**验证**: 注册成功跳转登录

### 提交插件

**步骤**:

1. 登录后点击 Publish
2. 填写插件信息（名称/描述/版本/仓库）
3. 提交

**验证**: 插件进入 pending 审核状态

### 查看审核状态

**步骤**:

1. 进入 Developer 页面
2. 查看自己的插件列表

**验证**: 显示各插件的 pending/approved/rejected 状态

---

## 用户/浏览器用户

**凭据**: `注册后登录`

**案例数**: 5

### 浏览插件市场

**步骤**:

1. 打开首页

**验证**: 插件卡片渲染（Auth Guard / AI Helper）

**截图**: ![浏览插件市场](../screenshots/matrix/market/market-01.png)

### 搜索插件

**步骤**:

1. 点击导航 Search
2. 输入 auth
3. 提交搜索

**验证**: Found 1 results，仅 Auth Guard

**截图**: ![搜索插件](../screenshots/matrix/market/market-03-search-auth.png)

### 查看插件详情

**步骤**:

1. 点击 Auth Guard 卡片

**验证**: 详情页显示 approved/Featured/v1.0.0

**截图**: ![查看插件详情](../screenshots/matrix/market/market-04-auth-guard-detail.png)

### 安装插件

**步骤**:

1. 在详情页点击 Install Plugin

**验证**: 后端 POST 200（UI 反馈为已知缺陷）

**截图**: ![安装插件](../screenshots/matrix/market/market-05-install-click.png)

### 写评论（逆向：静默失败）

**步骤**:

1. 在详情页评论表单填写 5 星+标题+正文
2. 点击提交

**验证**: ⚠ POST 404 Plugin not found，UI 清空表单假装成功（已知缺陷）

**截图**: ![写评论（逆向：静默失败）](../screenshots/matrix/market/market-07-review-after-submit.png)

---

## 游客（未登录）

**凭据**: `无需登录`

**案例数**: 3

### 浏览插件列表

**步骤**:

1. 直接打开首页

**验证**: 插件卡片可见

**截图**: ![浏览插件列表](../screenshots/matrix/market/market-01.png)

### 搜索（不需登录）

**步骤**:

1. 点击 Search
2. 输入关键词
3. 提交

**验证**: 搜索结果正常

**截图**: ![搜索（不需登录）](../screenshots/matrix/market/market-03-search-auth.png)

### 空结果态

**步骤**:

1. 搜索不存在的词 zzzqqq

**验证**: 显示 No results for zzzqqq

---

## 附：全部已知选择器（来自知识库）

| 键                    | 值                                                                                                                                                                                           |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| search_category_chips | "All \| wrench工具 \| sparklesAI chips under search box; chip state LEAKS from sidebar selection (AI chip stayed highlighted after searching auth) — chip does not appear to filter results" |

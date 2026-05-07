# 新功能验证计划

## 最近 5 次提交概览

| Commit | 描述 | 主要变更 |
|--------|------|----------|
| `4cd2ad4` | 文档和规则优化 | admin → ops 文档更新 |
| `ef123f5` | Sidebar 选中状态修复 | useLocation 检测路由，内联样式 |
| `72d2764` | antd message context 修复 | App 组件包裹，useMessage hook |
| `2e3ac49` | admin → ops 重命名 | 目录结构重构，创建 tenant 目录 |
| `b739c5f` | 多租户支持 | 租户管理 UI，tenant store/api |

---

## 一、环境准备

### 1.1 启动开发服务器
```bash
cd template
npm run dev
```

### 1.2 访问地址
| 应用 | 地址 |
|------|------|
| 用户前台 | http://localhost:5173/ |
| 运营后台 | http://localhost:5173/ops |

---

## 二、验证清单

### 2.1 运营后台（Ops）基础功能

#### 登录/注册
- [ ] 访问 http://localhost:5173/ops/login
- [ ] 使用测试账号登录（如 `superadmin` / `123456`）
- [ ] 验证登录成功后跳转到 Dashboard

#### Sidebar 导航
- [ ] 验证侧边栏菜单正常显示
- [ ] 点击不同菜单项，验证选中状态高亮（蓝色背景 + 白色文字）
- [ ] 验证未选中菜单为灰色文字

#### 页面功能
- [ ] Dashboard 页面正常加载统计数据
- [ ] 用户管理页面正常显示用户列表
- [ ] 订单管理页面正常显示订单列表
- [ ] 客服中心页面正常显示工单列表

#### Message 提示
- [ ] 执行任意操作（如创建用户）
- [ ] 验证成功/失败提示正常显示
- [ ] 确认无 antd message 警告

### 2.2 多租户功能

#### 租户管理
- [ ] 访问租户管理页面（需要登录后）
- [ ] 创建新租户
- [ ] 查看租户列表
- [ ] 切换当前租户

#### 成员管理
- [ ] 查看租户成员列表
- [ ] 邀请新成员
- [ ] 复制邀请链接

#### 角色管理
- [ ] 查看租户角色列表
- [ ] 验证系统默认角色（管理员、成员、访客）

### 2.3 架构验证

#### 目录结构
```bash
# 验证以下目录存在
ls -la src/ops/      # 运营后台
ls -la src/tenant/   # 租户管理
ls -la src/client/   # 用户前台
```

#### 路由配置
- [ ] `/ops/*` 路由正常工作
- [ ] `/tenant/*` 路由正常工作（如有）
- [ ] `/` 用户前台路由正常工作

---

## 三、自动化验证

### 3.1 类型检查
```bash
npm run typecheck
```
预期：无错误

### 3.2 测试
```bash
npm run test -- --run --exclude='**/chat-rpc.test.ts'
```
预期：所有测试通过

### 3.3 构建
```bash
npm run build
```
预期：构建成功

---

## 四、验证步骤

### Step 1: 启动服务器
```bash
cd template && npm run dev
```

### Step 2: 验证运营后台
1. 打开浏览器访问 http://localhost:5173/ops
2. 登录测试账号
3. 依次点击各菜单项，验证功能

### Step 3: 验证租户功能
1. 登录后访问租户管理页面
2. 创建租户、邀请成员

### Step 4: 运行自动化验证
```bash
npm run typecheck && npm run test -- --run --exclude='**/chat-rpc.test.ts' && npm run build
```

---

## 五、预期结果

- ✅ 运营后台正常访问和操作
- ✅ Sidebar 选中状态正确显示
- ✅ Message 提示无警告
- ✅ 租户管理功能正常
- ✅ 类型检查通过
- ✅ 测试通过
- ✅ 构建成功

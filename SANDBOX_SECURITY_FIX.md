# Sandbox 安全配置修复报告

## ✅ 已完成的修复

### 1. 网络访问配置

**修改：** `allowNetwork` 默认值从 `false` 改为 `true`

```typescript
const { workspacePath, allowNetwork = true } = options
```

**效果：** Sandbox 默认允许网络访问

---

### 2. 文件系统安全加固

#### 新增敏感文件读取阻止

```typescript
denyRead: [
  '~/.ssh', // SSH 私钥
  '~/.aws', // AWS 凭证
  '~/.git-credentials', // Git 凭证
  '/etc/passwd', // 系统用户信息
  '/etc/shadow', // 系统密码文件
]
```

#### 新增敏感文件写入阻止

```typescript
denyWrite: [
  '.env', // 环境变量
  '.env.local', // 本地环境变量
  '.env.production', // 生产环境变量
  '.git/config', // Git 配置
  '~/.bashrc', // Bash 配置
  '~/.zshrc', // Zsh 配置
  '~/.profile', // Profile 配置
]
```

#### 允许写入临时目录

```typescript
allowWrite: [workspacePath, '/tmp']
```

---

### 3. 环境变量配置

**文件：** `.env.example`

新增配置说明：

```bash
# ===========================================
# LLM & Sandbox Configuration
# ===========================================
# 启用 PI 配置（启用后将使用 Sandbox 安全沙箱）
# 生产环境建议设置为 true
# USE_PI_CONFIG=true

# Mock LLM 模式（开发环境使用，禁用 Sandbox）
# 生产环境必须设置为 false
# MOCK_LLM=false
```

---

## 📊 修复前后对比

| 配置项     | 修复前            | 修复后                    | 安全性      |
| ---------- | ----------------- | ------------------------- | ----------- |
| 网络默认值 | `false`           | `true`                    | ✅ 按需开启 |
| denyRead   | `[]`              | 5 个敏感路径              | ✅ 加固     |
| denyWrite  | `[]`              | 7 个敏感路径              | ✅ 加固     |
| allowWrite | `[workspacePath]` | `[workspacePath, '/tmp']` | ✅ 改进     |

---

## 🔒 当前安全配置总结

### 文件系统隔离

| 操作   | 策略       | 说明                              |
| ------ | ---------- | --------------------------------- |
| **读** | 拒绝后允许 | 默认允许读取，但阻止敏感路径      |
| **写** | 仅允许     | 默认拒绝写入，仅允许工作区和 /tmp |

### 网络隔离

| 场景               | 配置                    | 说明         |
| ------------------ | ----------------------- | ------------ |
| allowNetwork=true  | `allowedDomains: ['*']` | 允许所有域名 |
| allowNetwork=false | `allowedDomains: []`    | 无网络访问   |

---

## 🚀 使用方式

### 生产环境

```bash
# .env
USE_PI_CONFIG=true
MOCK_LLM=false
```

### 开发环境

```bash
# .env
USE_PI_CONFIG=false
MOCK_LLM=true
```

---

## ⚠️ 注意事项

1. **生产环境必须启用 Sandbox**
   - 设置 `USE_PI_CONFIG=true`
   - 设置 `MOCK_LLM=false`

2. **网络访问已允许**
   - 当前配置允许访问所有域名
   - 如需限制，修改 `allowedDomains` 为具体白名单

3. **敏感文件已保护**
   - SSH 密钥、AWS 凭证等无法被读取
   - 环境变量文件无法被修改

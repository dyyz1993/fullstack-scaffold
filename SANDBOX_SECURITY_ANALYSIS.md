# Sandbox 安全分析报告

## 🔍 当前项目 Sandbox 使用情况

### ✅ 是的，项目使用了 Sandbox

**使用的库：** `@anthropic-ai/sandbox-runtime` (v0.0.42)

**集成位置：**

- `template/src/server/module-agent/services/sandbox-bash.ts` - Sandbox 封装
- `template/src/server/module-agent/services/llm-service.ts:107-109` - 实际调用

---

## ⚠️ 关键发现：Sandbox 是**条件启用**的

### 激活条件（llm-service.ts:186-204）

Sandbox 仅在以下条件**同时满足**时才会启用：

```typescript
// 条件 1: 不使用 Mock LLM
process.env.MOCK_LLM !== 'true'

// 条件 2: 明确启用 PI 配置
process.env.USE_PI_CONFIG === 'true'

// 条件 3: 存在 PI 配置文件
~/.pi/aegnt / settings.json
```

**默认状态：** ❌ Sandbox **未启用**！

查看 `.env.example` 中**没有**设置 `USE_PI_CONFIG=true`，默认使用 Mock 模式。

---

## 🛡️ Sandbox 配置分析

### 当前配置（sandbox-bash.ts:14-30）

```typescript
const config: SandboxRuntimeConfig = {
  filesystem: {
    allowRead: [workspacePath], // 仅允许读取工作区
    denyRead: [],
    allowWrite: [workspacePath], // 仅允许写入工作区
    denyWrite: [],
  },
  network: allowNetwork
    ? { allowedDomains: ['*'], deniedDomains: [] } // ⚠️ 允许所有网络
    : { allowedDomains: [], deniedDomains: [] }, // ✅ 无网络
}
```

### 配置评估

| 配置项                    | 当前值            | 安全性  | 说明                     |
| ------------------------- | ----------------- | ------- | ------------------------ |
| 文件读                    | `[workspacePath]` | 🟡 中等 | 仅工作区，未阻止敏感文件 |
| 文件写                    | `[workspacePath]` | 🟡 中等 | 仅工作区，但无额外保护   |
| 网络（默认）              | `[]`              | ✅ 安全 | 无网络访问               |
| 网络（allowNetwork=true） | `['*']`           | 🔴 危险 | 允许所有域名             |

---

## 🚨 潜在逃逸风险分析

### 风险 1: Sandbox 未启用（最严重）

**场景：** 默认配置下，Sandbox 完全不工作

**影响：** AI Agent 可以无限制访问整个文件系统和网络

**验证代码：**

```bash
# 检查当前配置
cd /Users/xuyingzhou/Project/create-biomimic-app/template
grep -E "USE_PI_CONFIG|MOCK_LLM" .env* || echo "未设置相关环境变量"
```

---

### 风险 2: 网络配置过于宽松

**场景：** 当 `allowNetwork=true` 时，允许 `['*']` 所有域名

**风险：**

- 数据泄露：可以上传文件到任意服务器
- 恶意下载：可以下载任意恶意软件
- 内网扫描：可以访问内网服务

**建议：** 使用明确的白名单，而非 `['*']`

---

### 风险 3: 缺少敏感路径阻止

**当前配置：** `denyRead: []` 和 `denyWrite: []` 为空

**建议添加：**

```typescript
denyRead: ['~/.ssh', '~/.aws', '~/.git-credentials', '/etc/passwd']
denyWrite: ['.env', '.git/config', '~/.bashrc', '~/.zshrc']
```

---

### 风险 4: vm2 已知漏洞

**vm2 历史：** 该库历史上出现过多个严重的沙箱逃逸漏洞

**当前版本：** v3.10.5（较旧）

**建议：**

- 仅在必要时使用 vm2
- 考虑替代方案：`isolated-vm` 或 `@nodevm`
- 如不使用，考虑从 `package.json` 中移除

---

## ✅ Sandbox 有效性验证

让我们测试一下 Sandbox 是否真的有效果：

### 测试 1: 文件系统隔离

```bash
cd /Users/xuyingzhou/Project/create-biomimic-app/template

# 创建临时配置
cat &gt; ~/.srt-settings.json &lt;&lt; 'EOF'
{
  "network": { "allowedDomains": ["example.com"] },
  "filesystem": {
    "allowWrite": [".", "/tmp"],
    "denyRead": ["~/.ssh"]
  }
}
EOF

# 测试 1: 尝试读取敏感文件（应该被阻止）
echo "=== 测试 1: 读取敏感文件 ==="
npx srt "cat ~/.ssh/id_rsa 2&gt;&amp;1 || echo '✅ 访问被阻止（预期行为）'"

# 测试 2: 尝试写当前目录（应该被允许）
echo -e "\n=== 测试 2: 写当前目录 ==="
npx srt "echo 'test' &gt; sandbox-test.tmp &amp;&amp; cat sandbox-test.tmp &amp;&amp; rm sandbox-test.tmp"

# 测试 3: 网络访问（允许的域名）
echo -e "\n=== 测试 3: 允许的网络 ==="
npx srt "curl -s -I https://example.com --connect-timeout 3 2&gt;&amp;1 | head -n 1"

# 测试 4: 网络访问（不允许的域名）
echo -e "\n=== 测试 4: 阻止的网络 ==="
npx srt "curl -s -I https://google.com --connect-timeout 3 2&gt;&amp;1 | head -n 5 || echo '连接被阻止'"

# 清理
rm ~/.srt-settings.json
```

---

## 🔧 安全加固建议

### 立即修复

1. **明确 Sandbox 启用状态**

   ```bash
   # 在 .env 中明确设置
   USE_PI_CONFIG=true
   MOCK_LLM=false
   ```

2. **加强文件系统限制**（修改 sandbox-bash.ts）

   ```typescript
   const config: SandboxRuntimeConfig = {
     filesystem: {
       allowRead: [workspacePath],
       denyRead: ['~/.ssh', '~/.aws', '~/.git-credentials', '/etc/passwd', '/etc/shadow'],
       allowWrite: [workspacePath, '/tmp'],
       denyWrite: ['.env', '.env.local', '.git/config', '~/.bashrc', '~/.zshrc'],
     },
     network: allowNetwork
       ? {
           allowedDomains: ['github.com', '*.github.com', 'npmjs.org', '*.npmjs.org'],
           deniedDomains: [],
         }
       : { allowedDomains: [], deniedDomains: [] },
   }
   ```

3. **考虑移除未使用的 vm2**
   ```bash
   npm uninstall vm2
   ```

### 长期建议

1. **添加 Sandbox 集成测试**
2. **实现违规日志监控**
3. **定期更新 @anthropic-ai/sandbox-runtime**
4. **考虑多沙箱策略**（不同任务使用不同配置）

---

## 📊 总结

| 问题               | 严重程度 | 状态         |
| ------------------ | -------- | ------------ |
| Sandbox 默认未启用 | 🔴 严重  | 需要修复     |
| 网络配置过于宽松   | 🟡 中等  | 需要优化     |
| 缺少敏感路径阻止   | 🟡 中等  | 需要添加     |
| vm2 潜在漏洞       | 🟡 中等  | 评估是否需要 |

**总体评估：** 项目有 Sandbox 基础设施，但默认配置下**未启用**，存在安全风险。建议立即加固配置并确保 Sandbox 在生产环境中始终启用。
